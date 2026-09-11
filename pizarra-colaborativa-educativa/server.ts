import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import {
  Room,
  Participant,
  ClientEvent,
  ServerEvent,
  ActivityTemplate,
} from './src/types';
import { DEFAULT_ACTIVITIES } from './src/data/defaultActivities';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

app.use(express.json({ limit: '10mb' }));

// In-memory Room & Template stores
const rooms = new Map<string, Room>();
const customTemplates = new Map<string, ActivityTemplate>();

interface ClientMeta {
  roomId?: string;
  participantId?: string;
  isAlive: boolean;
}
const clients = new Map<WebSocket, ClientMeta>();

// Eventos que SOLO el profesor puede disparar
const TEACHER_ONLY_EVENTS = new Set<string>([
  'elements:batchCreate',
  'elements:clear',
  'board:lock',
  'board:toggleCursors',
  'board:setWorkMode',
  'board:changePage',
  'board:addPage',
  'board:deletePage',
  'timer:start',
  'timer:pause',
  'timer:resume',
  'timer:reset',
  'challenge:start',
  'challenge:end',
  'user:kick',
  'activity:rename',
]);

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

// FIX: nunca mandar teacherKey a los clientes
function publicRoom(room: Room): Omit<Room, 'teacherKey'> {
  const { teacherKey: _tk, ...rest } = room;
  return rest;
}

function send(ws: WebSocket, event: ServerEvent | { type: 'error'; message: string } | { type: 'pong' }) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
}

function broadcastToRoom(roomId: string, event: ServerEvent, excludeWs?: WebSocket) {
  const payload = JSON.stringify(event);
  clients.forEach((meta, ws) => {
    if (meta.roomId === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

function getCaller(ws: WebSocket, room: Room): Participant | undefined {
  const meta = clients.get(ws);
  return meta?.participantId ? room.participants[meta.participantId] : undefined;
}

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  clients.set(ws, { isAlive: true });

  ws.on('pong', () => {
    const meta = clients.get(ws);
    if (meta) meta.isAlive = true;
  });

  ws.on('message', (rawData: RawData) => {
    try {
      const event: ClientEvent = JSON.parse(rawData.toString());
      handleClientEvent(ws, event);
    } catch (err) {
      console.error('Error parsing client event:', err);
    }
  });

  ws.on('close', () => {
    const meta = clients.get(ws);
    if (meta?.roomId && meta.participantId) {
      const room = getSafeRoom(meta.roomId);
      const p = room?.participants[meta.participantId];
      if (room && p) {
        p.isOnline = false;
        p.lastSeen = Date.now();
        broadcastToRoom(meta.roomId, { type: 'participant:left', participantId: meta.participantId });
      }
    }
    clients.delete(ws);
  });
});

// Heartbeat + timers + limpieza
setInterval(() => {
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

  const now = Date.now();
  rooms.forEach((room) => {
    if (room.timer.isRunning) {
      room.timer.remaining = Math.max(0, room.timer.remaining - 1);
      if (room.timer.remaining === 0) {
        room.timer.isRunning = false;
        if (room.timer.autoLockOnZero && !room.isLocked) {
          room.isLocked = true;
          broadcastToRoom(room.id, { type: 'board:locked', isLocked: true });
        }
      }
      broadcastToRoom(room.id, { type: 'timer:sync', timer: room.timer });
    }

    // FIX: al expirar la sala, avisar y cerrar sockets en lugar de dejarlos colgados
    if (now - room.createdAt > ROOM_TTL_MS) {
      clients.forEach((meta, ws) => {
        if (meta.roomId === room.id) {
          send(ws, { type: 'error', message: 'La sala expiró (24 h).' });
          ws.close(4000, 'room-expired');
        }
      });
      rooms.delete(room.id);
    }
  });
}, 1000);

function handleClientEvent(ws: WebSocket, event: ClientEvent) {
  if (event.type === 'ping') {
    send(ws, { type: 'pong' });
    return;
  }

  const roomId = event.roomId?.toUpperCase();
  if (!roomId) return;

  const room = getSafeRoom(roomId);
  if (!room) {
    send(ws, { type: 'error', message: 'La sala no existe o ha expirado.' });
    return;
  }

  const clientMeta = clients.get(ws);

  if (event.type === 'join') {
    if (!event.participant?.id || !event.participant?.name) {
      send(ws, { type: 'error', message: 'Datos de participante inválidos.' });
      return;
    }
    const participantId = event.participant.id;
    const isTeacher = !!event.teacherKey && event.teacherKey === room.teacherKey;
    const role: 'teacher' | 'student' = isTeacher ? 'teacher' : 'student';

    if (clientMeta) {
      clientMeta.roomId = roomId;
      clientMeta.participantId = participantId;
    }

    const existing = room.participants[participantId];
    const participant: Participant = {
      ...event.participant,
      role, // FIX: el rol lo decide el servidor, no el cliente
      isOnline: true,
      lastSeen: Date.now(),
      color: existing?.color || event.participant.color,
    };
    room.participants[participantId] = participant;

    send(ws, { type: 'room:state', room: publicRoom(room) as Room });
    broadcastToRoom(roomId, { type: 'participant:joined', participant }, ws);
    return;
  }

  // FIX: todo lo demás exige estar unido a ESTA sala
  if (!clientMeta?.participantId || clientMeta.roomId !== roomId) {
    send(ws, { type: 'error', message: 'Primero debes unirte a la sala.' });
    return;
  }

  const caller = getCaller(ws, room);
  if (!caller) {
    send(ws, { type: 'error', message: 'Participante no reconocido.' });
    return;
  }
  const isTeacher = caller.role === 'teacher';

  // FIX: acciones de control solo para el profesor
  if (TEACHER_ONLY_EVENTS.has(event.type) && !isTeacher) {
    send(ws, { type: 'error', message: 'Solo el profesor puede hacer esto.' });
    return;
  }

  switch (event.type) {
    case 'element:create': {
      if (room.isLocked && !isTeacher) {
        send(ws, { type: 'error', message: 'La pizarra está bloqueada por el profesor.' });
        return;
      }
      // FIX: creatorRole lo fija el servidor (evita que un alumno se haga pasar por profe)
      const el = { ...event.element, creatorRole: caller.role, creatorId: caller.id } as typeof event.element;
      room.elements[el.id] = el;
      broadcastToRoom(roomId, { type: 'element:created', element: el });
      break;
    }

    case 'element:update': {
      const existing = room.elements[event.elementId];
      if (!existing) return;
      if (room.isLocked && !isTeacher) {
        send(ws, { type: 'error', message: 'La pizarra está bloqueada.' });
        return;
      }
      if (existing.isLocked && !isTeacher) return;

      // FIX: un alumno no puede reasignarse el rol/creador vía changes
      const { creatorRole: _r, creatorId: _c, id: _id, ...changes } = event.changes as any;
      room.elements[event.elementId] = { ...existing, ...changes, updatedAt: Date.now() };
      broadcastToRoom(roomId, { type: 'element:updated', elementId: event.elementId, changes });
      break;
    }

    case 'element:delete': {
      const existing = room.elements[event.elementId];
      if (!existing) return;
      if (room.isLocked && !isTeacher) return;
      if (existing.isLocked && !isTeacher) return;
      // FIX: respetar allowStudentEraseOthers
      if (!isTeacher && !room.allowStudentEraseOthers && (existing as any).creatorId && (existing as any).creatorId !== caller.id) {
        send(ws, { type: 'error', message: 'No puedes borrar elementos de otros.' });
        return;
      }
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
        if (el.pageId !== targetPageId) return;
        if (event.studentOnly) {
          if (el.creatorRole === 'student' && !el.isTemplateItem) delete room.elements[id];
        } else {
          delete room.elements[id];
        }
      });
      broadcastToRoom(roomId, { type: 'elements:cleared', pageId: targetPageId, studentOnly: event.studentOnly });
      break;
    }

    case 'cursor:move': {
      if (!room.showCursors) return;
      // FIX: usar el id real del socket, no el que diga el cliente
      caller.cursor = { x: event.x, y: event.y };
      broadcastToRoom(roomId, { type: 'cursor:moved', participantId: caller.id, x: event.x, y: event.y }, ws);
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
      if (event.workMode === 'individual') {
        Object.values(room.participants)
          .filter((p) => p.role === 'student')
          .forEach((p) => {
            const pageId = `page_ind_${p.id}`;
            if (!room.pages.find((pg) => pg.id === pageId)) {
              room.pages.push({ id: pageId, title: `Pizarra de ${p.name}`, background: 'grid', ownerStudentId: p.id });
            }
          });
      } else if (event.workMode === 'teams') {
        ['Equipo Azul', 'Equipo Verde', 'Equipo Naranja'].forEach((teamName, idx) => {
          const teamId = `team_${idx + 1}`;
          if (!room.pages.find((pg) => pg.teamId === teamId)) {
            room.pages.push({ id: `page_team_${idx + 1}`, title: teamName, background: 'grid', teamId });
          }
        });
      }
      broadcastToRoom(roomId, { type: 'board:workModeChanged', workMode: event.workMode, pages: room.pages });
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
      if (!event.page?.id || room.pages.some((p) => p.id === event.page.id)) return;
      room.pages.push(event.page);
      broadcastToRoom(roomId, { type: 'board:pageAdded', page: event.page });
      break;
    }

    case 'board:deletePage': {
      if (room.pages.length <= 1) return;
      if (!room.pages.some((p) => p.id === event.pageId)) return;
      room.pages = room.pages.filter((p) => p.id !== event.pageId);
      if (room.activePageId === event.pageId) room.activePageId = room.pages[0].id;
      Object.keys(room.elements).forEach((elId) => {
        if (room.elements[elId].pageId === event.pageId) delete room.elements[elId];
      });
      broadcastToRoom(roomId, { type: 'board:pageDeleted', pageId: event.pageId });
      // FIX: avisar el cambio de página activa si se borró la que estaba abierta
      broadcastToRoom(roomId, { type: 'board:pageChanged', pageId: room.activePageId });
      break;
    }

    case 'timer:start': {
      const duration = Math.max(0, Math.floor(Number(event.duration) || 0));
      if (duration === 0) return;
      room.timer = { duration, remaining: duration, isRunning: true, autoLockOnZero: !!event.autoLock, startedAt: Date.now() };
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
      room.timer = { duration: 0, remaining: 0, isRunning: false, autoLockOnZero: false };
      broadcastToRoom(roomId, { type: 'timer:sync', timer: room.timer });
      break;
    }

    case 'challenge:start': {
      room.challenge = { ...event.challenge, submissions: {}, isActive: true, startedAt: Date.now() };
      broadcastToRoom(roomId, { type: 'challenge:updated', challenge: room.challenge });
      break;
    }

    case 'challenge:submit': {
      if (!room.challenge?.isActive) {
        send(ws, { type: 'error', message: 'No hay un reto activo.' });
        return;
      }
      // FIX: un alumno solo puede enviar SU respuesta
      const submission = { ...event.submission, studentId: caller.id };
      room.challenge.submissions[caller.id] = submission;
      broadcastToRoom(roomId, { type: 'challenge:updated', challenge: room.challenge });
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
      const target = room.participants[targetId];
      if (!target || target.role === 'teacher') return;
      delete room.participants[targetId];
      broadcastToRoom(roomId, { type: 'participant:kicked', participantId: targetId });
      // FIX: cerrar de verdad el socket del expulsado (antes seguía recibiendo todo)
      clients.forEach((meta, sock) => {
        if (meta.roomId === roomId && meta.participantId === targetId) {
          meta.roomId = undefined;
          meta.participantId = undefined;
          sock.close(4001, 'kicked');
        }
      });
      break;
    }

    case 'activity:rename': {
      const newName = String(event.newName || '').trim().slice(0, 80);
      if (!newName) return;
      room.activityName = newName;
      broadcastToRoom(roomId, { type: 'activity:renamed', newName });
      break;
    }
  }
}

// ---------- REST ----------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

app.post('/api/rooms', (req, res) => {
  const { activityName, templateId } = req.body ?? {};
  let code = generateRoomCode();
  while (rooms.has(code)) code = generateRoomCode();

  const teacherKey = 'tk_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
  const initialPageId = 'page_1';

  const newRoom: Room = {
    id: code,
    activityName: String(activityName || '').trim() || 'Clase Interactiva',
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
    timer: { duration: 0, remaining: 0, isRunning: false, autoLockOnZero: false },
  };

  if (templateId) {
    const template = DEFAULT_ACTIVITIES.find((t) => t.id === templateId) || customTemplates.get(templateId);
    if (template) {
      const now = Date.now();
      template.elements.forEach((elemDef, idx) => {
        const id = `el_${now}_${idx}`;
        newRoom.elements[id] = {
          ...elemDef,
          id,
          pageId: initialPageId,
          creatorRole: 'teacher',
          isTemplateItem: true,
          createdAt: now,
          updatedAt: now,
        };
      });
      if (template.challenge) {
        newRoom.challenge = {
          ...template.challenge,
          id: template.challenge.id || 'chal_' + now,
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

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) {
    res.status(404).json({ error: 'Sala no encontrada o ha expirado.' });
    return;
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

app.get('/api/templates', (_req, res) => {
  res.json([...DEFAULT_ACTIVITIES, ...Array.from(customTemplates.values())]);
});

app.post('/api/templates', (req, res) => {
  const { title, subject, grade, description, elements, challenge } = req.body ?? {};
  const id = 'custom_' + Date.now();
  const newTemplate: ActivityTemplate = {
    id,
    title: title || 'Mi Plantilla',
    subject: subject || 'matematicas',
    grade: grade || 'Primaria',
    description: description || '',
    elements: Array.isArray(elements) ? elements : [],
    challenge,
    isCustom: true,
  };
  customTemplates.set(id, newTemplate);
  res.json(newTemplate);
});

app.delete('/api/templates/:id', (req, res) => {
  if (customTemplates.delete(req.params.id)) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Plantilla no encontrada.' });
  }
});

// ---------- Vite / static ----------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // FIX: import dinámico para que el bundle de producción no cargue Vite
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // FIX: no exponer el bundle del servidor ni su sourcemap
    app.use((req, res, next) => {
      if (/^\/server\.cjs(\.map)?$/.test(req.path)) return res.status(404).end();
      next();
    });
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Educational Whiteboard Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
