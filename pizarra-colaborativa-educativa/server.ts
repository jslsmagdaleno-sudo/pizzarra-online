import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  Room,
  Participant,
  ClientEvent,
  ServerEvent,
  WhiteboardElement,
  BoardPage,
  TimerState,
  ChallengeState,
  WorkMode,
  ActivityTemplate,
} from './src/types';
import { DEFAULT_ACTIVITIES } from './src/data/defaultActivities';

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory Room & Template stores
const rooms = new Map<string, Room>();
const customTemplates = new Map<string, ActivityTemplate>();

// Connected WebSocket clients: ws -> { roomId, participantId }
interface ClientMeta {
  roomId?: string;
  participantId?: string;
  isAlive: boolean;
}
const clients = new Map<WebSocket, ClientMeta>();

// Helper to generate a 5-character friendly uppercase room code (avoid confusing chars like 0, O, 1, I)
function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getSafeRoom(roomId: string): Room | undefined {
  return rooms.get(roomId.toUpperCase());
}

// Broadcast helper to all clients in a specific room
function broadcastToRoom(roomId: string, event: ServerEvent, excludeWs?: WebSocket) {
  const payload = JSON.stringify(event);
  clients.forEach((meta, ws) => {
    if (meta.roomId === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

// WebSocket Server initialization
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  clients.set(ws, { isAlive: true });

  ws.on('pong', () => {
    const meta = clients.get(ws);
    if (meta) meta.isAlive = true;
  });

  ws.on('message', (rawData: string) => {
    try {
      const event: ClientEvent = JSON.parse(rawData.toString());
      handleClientEvent(ws, event);
    } catch (err) {
      console.error('Error parsing client event:', err);
    }
  });

  ws.on('close', () => {
    const meta = clients.get(ws);
    if (meta && meta.roomId && meta.participantId) {
      const room = getSafeRoom(meta.roomId);
      if (room && room.participants[meta.participantId]) {
        room.participants[meta.participantId].isOnline = false;
        room.participants[meta.participantId].lastSeen = Date.now();
        broadcastToRoom(meta.roomId, {
          type: 'participant:left',
          participantId: meta.participantId,
        });
      }
    }
    clients.delete(ws);
  });
});

// Periodic heartbeat & room timer tick
setInterval(() => {
  // 1. WebSocket heartbeats
  wss.clients.forEach((ws) => {
    const meta = clients.get(ws);
    if (!meta) return;
    if (!meta.isAlive) {
      ws.terminate();
      return;
    }
    meta.isAlive = false;
    ws.ping();
  });

  // 2. Room timers
  const now = Date.now();
  rooms.forEach((room) => {
    if (room.timer.isRunning) {
      if (room.timer.remaining > 0) {
        room.timer.remaining -= 1;
      }
      if (room.timer.remaining <= 0) {
        room.timer.remaining = 0;
        room.timer.isRunning = false;
        if (room.timer.autoLockOnZero) {
          room.isLocked = true;
          broadcastToRoom(room.id, { type: 'board:locked', isLocked: true });
        }
      }
      broadcastToRoom(room.id, { type: 'timer:sync', timer: room.timer });
    }

    // 3. Clean rooms older than 24 hours
    if (now - room.createdAt > 24 * 60 * 60 * 1000) {
      rooms.delete(room.id);
    }
  });
}, 1000);

function handleClientEvent(ws: WebSocket, event: ClientEvent) {
  if (event.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong' }));
    return;
  }

  const roomId = event.roomId?.toUpperCase();
  if (!roomId) return;

  const room = getSafeRoom(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'error', message: 'La sala no existe o ha expirado.' }));
    return;
  }

  const clientMeta = clients.get(ws);

  switch (event.type) {
    case 'join': {
      const participantId = event.participant.id;
      const isTeacher = event.teacherKey && event.teacherKey === room.teacherKey;
      const role: 'teacher' | 'student' = isTeacher ? 'teacher' : 'student';

      if (clientMeta) {
        clientMeta.roomId = roomId;
        clientMeta.participantId = participantId;
      }

      // Add or reconnect participant
      const existing = room.participants[participantId];
      const participant: Participant = {
        ...event.participant,
        role,
        isOnline: true,
        lastSeen: Date.now(),
        color: existing?.color || event.participant.color,
      };

      room.participants[participantId] = participant;

      // Send initial room state to joining client
      ws.send(JSON.stringify({ type: 'room:state', room }));

      // Notify others in room
      broadcastToRoom(roomId, { type: 'participant:joined', participant }, ws);
      break;
    }

    case 'element:create': {
      if (room.isLocked && event.element.creatorRole !== 'teacher') {
        ws.send(JSON.stringify({ type: 'error', message: 'La pizarra está bloqueada por el profesor.' }));
        return;
      }
      const el = event.element;
      room.elements[el.id] = el;
      broadcastToRoom(roomId, { type: 'element:created', element: el }, ws);
      break;
    }

    case 'element:update': {
      const existing = room.elements[event.elementId];
      if (!existing) return;

      const meta = clientMeta;
      const caller = meta?.participantId ? room.participants[meta.participantId] : undefined;
      const isTeacher = caller?.role === 'teacher';

      if (room.isLocked && !isTeacher) {
        ws.send(JSON.stringify({ type: 'error', message: 'La pizarra está bloqueada.' }));
        return;
      }

      // If locked template item, only teacher can move
      if (existing.isLocked && !isTeacher) {
        return;
      }

      // Apply changes (idempotent last-write-wins)
      room.elements[event.elementId] = {
        ...existing,
        ...event.changes,
        updatedAt: Date.now(),
      };

      broadcastToRoom(
        roomId,
        {
          type: 'element:updated',
          elementId: event.elementId,
          changes: event.changes,
        },
        ws
      );
      break;
    }

    case 'element:delete': {
      const existing = room.elements[event.elementId];
      if (!existing) return;

      const meta = clientMeta;
      const caller = meta?.participantId ? room.participants[meta.participantId] : undefined;
      const isTeacher = caller?.role === 'teacher';

      if (room.isLocked && !isTeacher) return;
      if (existing.isLocked && !isTeacher) return;

      delete room.elements[event.elementId];
      broadcastToRoom(roomId, { type: 'element:deleted', elementId: event.elementId });
      break;
    }

    case 'elements:batchCreate': {
      event.elements.forEach((el) => {
        room.elements[el.id] = el;
      });
      broadcastToRoom(roomId, { type: 'elements:batchCreated', elements: event.elements });
      break;
    }

    case 'elements:clear': {
      const targetPageId = event.pageId || room.activePageId;
      Object.keys(room.elements).forEach((id) => {
        const el = room.elements[id];
        if (el.pageId === targetPageId) {
          if (event.studentOnly) {
            if (el.creatorRole === 'student' && !el.isTemplateItem) {
              delete room.elements[id];
            }
          } else {
            delete room.elements[id];
          }
        }
      });
      broadcastToRoom(roomId, {
        type: 'elements:cleared',
        pageId: targetPageId,
        studentOnly: event.studentOnly,
      });
      break;
    }

    case 'cursor:move': {
      if (!room.showCursors) return;
      if (room.participants[event.participantId]) {
        room.participants[event.participantId].cursor = { x: event.x, y: event.y };
      }
      broadcastToRoom(
        roomId,
        {
          type: 'cursor:moved',
          participantId: event.participantId,
          x: event.x,
          y: event.y,
        },
        ws
      );
      break;
    }

    case 'board:lock': {
      room.isLocked = event.isLocked;
      broadcastToRoom(roomId, { type: 'board:locked', isLocked: event.isLocked });
      break;
    }

    case 'board:toggleCursors': {
      room.showCursors = event.showCursors;
      broadcastToRoom(roomId, { type: 'board:cursorsToggled', showCursors: event.showCursors });
      break;
    }

    case 'board:setWorkMode': {
      room.workMode = event.workMode;

      // If switching to individual work mode, ensure each student has a dedicated page
      if (event.workMode === 'individual') {
        const studentParticipants = Object.values(room.participants).filter((p) => p.role === 'student');
        studentParticipants.forEach((p) => {
          const pageId = `page_ind_${p.id}`;
          if (!room.pages.find((pg) => pg.id === pageId)) {
            room.pages.push({
              id: pageId,
              title: `Pizarra de ${p.name}`,
              background: 'grid',
              ownerStudentId: p.id,
            });
          }
        });
      } else if (event.workMode === 'teams') {
        // Teams pages: Equipo 1, Equipo 2, Equipo 3
        ['Equipo Azul', 'Equipo Verde', 'Equipo Naranja'].forEach((teamName, idx) => {
          const teamId = `team_${idx + 1}`;
          if (!room.pages.find((pg) => pg.teamId === teamId)) {
            room.pages.push({
              id: `page_team_${idx + 1}`,
              title: teamName,
              background: 'grid',
              teamId,
            });
          }
        });
      }

      broadcastToRoom(roomId, {
        type: 'board:workModeChanged',
        workMode: event.workMode,
        pages: room.pages,
      });
      break;
    }

    case 'board:changePage': {
      if (room.pages.some((p) => p.id === event.pageId)) {
        room.activePageId = event.pageId;
        broadcastToRoom(roomId, { type: 'board:pageChanged', pageId: event.pageId });
      }
      break;
    }

    case 'board:addPage': {
      room.pages.push(event.page);
      broadcastToRoom(roomId, { type: 'board:pageAdded', page: event.page });
      break;
    }

    case 'board:deletePage': {
      if (room.pages.length > 1) {
        room.pages = room.pages.filter((p) => p.id !== event.pageId);
        if (room.activePageId === event.pageId) {
          room.activePageId = room.pages[0].id;
        }
        // Remove page elements
        Object.keys(room.elements).forEach((elId) => {
          if (room.elements[elId].pageId === event.pageId) {
            delete room.elements[elId];
          }
        });
        broadcastToRoom(roomId, { type: 'board:pageDeleted', pageId: event.pageId });
      }
      break;
    }

    case 'timer:start': {
      room.timer = {
        duration: event.duration,
        remaining: event.duration,
        isRunning: true,
        autoLockOnZero: event.autoLock,
        startedAt: Date.now(),
      };
      broadcastToRoom(roomId, { type: 'timer:sync', timer: room.timer });
      break;
    }

    case 'timer:pause': {
      room.timer.isRunning = false;
      broadcastToRoom(roomId, { type: 'timer:sync', timer: room.timer });
      break;
    }

    case 'timer:resume': {
      if (room.timer.remaining > 0) {
        room.timer.isRunning = true;
        broadcastToRoom(roomId, { type: 'timer:sync', timer: room.timer });
      }
      break;
    }

    case 'timer:reset': {
      room.timer = {
        duration: 0,
        remaining: 0,
        isRunning: false,
        autoLockOnZero: false,
      };
      broadcastToRoom(roomId, { type: 'timer:sync', timer: room.timer });
      break;
    }

    case 'challenge:start': {
      room.challenge = {
        ...event.challenge,
        submissions: {},
        isActive: true,
        startedAt: Date.now(),
      };
      broadcastToRoom(roomId, { type: 'challenge:updated', challenge: room.challenge });
      break;
    }

    case 'challenge:submit': {
      if (room.challenge) {
        room.challenge.submissions[event.submission.studentId] = event.submission;
        broadcastToRoom(roomId, { type: 'challenge:updated', challenge: room.challenge });
      }
      break;
    }

    case 'challenge:end': {
      if (room.challenge) {
        room.challenge.isActive = false;
        broadcastToRoom(roomId, { type: 'challenge:updated', challenge: room.challenge });
      }
      break;
    }

    case 'user:kick': {
      const targetId = event.targetParticipantId;
      if (room.participants[targetId]) {
        delete room.participants[targetId];
        broadcastToRoom(roomId, { type: 'participant:kicked', participantId: targetId });
      }
      break;
    }

    case 'activity:rename': {
      room.activityName = event.newName;
      broadcastToRoom(roomId, { type: 'activity:renamed', newName: event.newName });
      break;
    }
  }
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

// Create Room
app.post('/api/rooms', (req, res) => {
  const { activityName, templateId } = req.body;
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const teacherKey = 'tk_' + Math.random().toString(36).substring(2, 12);
  const initialPageId = 'page_1';

  const newRoom: Room = {
    id: code,
    activityName: activityName?.trim() || 'Clase Interactiva',
    createdAt: Date.now(),
    teacherKey,
    isLocked: false,
    showCursors: true,
    allowStudentEraseOthers: false,
    workMode: 'collective',
    activePageId: initialPageId,
    pages: [{ id: initialPageId, title: 'Página 1', background: 'grid' }],
    elements: {},
    participants: {},
    timer: {
      duration: 0,
      remaining: 0,
      isRunning: false,
      autoLockOnZero: false,
    },
  };

  // If created with a template, initialize its elements and challenge
  if (templateId) {
    const template =
      DEFAULT_ACTIVITIES.find((t) => t.id === templateId) || customTemplates.get(templateId);
    if (template) {
      template.elements.forEach((elemDef, idx) => {
        const id = 'el_' + Date.now() + '_' + idx;
        newRoom.elements[id] = {
          ...elemDef,
          id,
          pageId: initialPageId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      });

      if (template.challenge) {
        newRoom.challenge = {
          ...template.challenge,
          id: template.challenge.id || 'chal_' + Date.now(),
          title: template.challenge.title || template.title,
          instructions: template.challenge.instructions || '',
          type: template.challenge.type || 'general',
          submissions: {},
          isActive: false,
        };
      }
    }
  }

  rooms.set(code, newRoom);
  res.json({ roomId: code, teacherKey, activityName: newRoom.activityName });
});

// Get Room details
app.get('/api/rooms/:id', (req, res) => {
  const code = req.params.id.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada o ha expirado.' });
  }
  res.json({
    id: room.id,
    activityName: room.activityName,
    isLocked: room.isLocked,
    participantsCount: Object.keys(room.participants).length,
    workMode: room.workMode,
    createdAt: room.createdAt,
  });
});

// Templates API
app.get('/api/templates', (req, res) => {
  const allTemplates = [...DEFAULT_ACTIVITIES, ...Array.from(customTemplates.values())];
  res.json(allTemplates);
});

app.post('/api/templates', (req, res) => {
  const { title, subject, grade, description, elements, challenge } = req.body;
  const id = 'custom_' + Date.now();
  const newTemplate: ActivityTemplate = {
    id,
    title: title || 'Mi Plantilla',
    subject: subject || 'matematicas',
    grade: grade || 'Primaria',
    description: description || '',
    elements: elements || [],
    challenge,
    isCustom: true,
  };
  customTemplates.set(id, newTemplate);
  res.json(newTemplate);
});

app.delete('/api/templates/:id', (req, res) => {
  const id = req.params.id;
  if (customTemplates.has(id)) {
    customTemplates.delete(id);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Plantilla no encontrada.' });
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Educational Whiteboard Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
