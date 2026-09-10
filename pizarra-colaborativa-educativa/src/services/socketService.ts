import { ClientEvent, ServerEvent, Participant, WhiteboardElement, BoardPage, WorkMode, ChallengeState, ChallengeSubmission } from '../types';

type EventHandler<T = any> = (data: T) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private pendingQueue: ClientEvent[] = [];
  public isConnected = false;
  private currentRoomId?: string;
  private currentParticipant?: Omit<Participant, 'isOnline' | 'lastSeen'>;
  private currentTeacherKey?: string;

  connect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        resolve();
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.trigger('connection:change', true);

          // Flush pending queue
          while (this.pendingQueue.length > 0) {
            const ev = this.pendingQueue.shift();
            if (ev) this.send(ev);
          }

          // Re-join if we were already in a room
          if (this.currentRoomId && this.currentParticipant) {
            this.send({
              type: 'join',
              roomId: this.currentRoomId,
              participant: this.currentParticipant,
              teacherKey: this.currentTeacherKey,
            });
          }

          // Heartbeat ping
          if (this.pingInterval) clearInterval(this.pingInterval);
          this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.send({ type: 'ping' });
            }
          }, 15000);

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: ServerEvent = JSON.parse(event.data);
            this.trigger(data.type, data);
          } catch (err) {
            console.error('Failed to parse WebSocket message', err);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.trigger('connection:change', false);
          if (this.pingInterval) clearInterval(this.pingInterval);
          this.scheduleReconnect();
        };

        this.ws.onerror = (err) => {
          console.warn('WebSocket error, will reconnect', err);
          this.isConnected = false;
        };
      } catch (err) {
        console.error('WebSocket connection failed to initiate', err);
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.currentRoomId = undefined;
    this.currentParticipant = undefined;
    this.currentTeacherKey = undefined;
  }

  send(event: ClientEvent) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      // Don't queue continuous cursor moves to avoid flooding on reconnect
      if (event.type !== 'cursor:move' && event.type !== 'ping') {
        this.pendingQueue.push(event);
      }
      if (!this.isConnected) {
        this.connect();
      }
    }
  }

  on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private trigger(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      });
    }
  }

  // Room Actions
  joinRoom(roomId: string, participant: Omit<Participant, 'isOnline' | 'lastSeen'>, teacherKey?: string) {
    this.currentRoomId = roomId;
    this.currentParticipant = participant;
    this.currentTeacherKey = teacherKey;
    this.send({
      type: 'join',
      roomId,
      participant,
      teacherKey,
    });
  }

  createElement(roomId: string, element: WhiteboardElement) {
    this.send({ type: 'element:create', roomId, element });
  }

  updateElement(roomId: string, elementId: string, changes: Partial<WhiteboardElement>) {
    this.send({ type: 'element:update', roomId, elementId, changes });
  }

  deleteElement(roomId: string, elementId: string, participantId: string) {
    this.send({ type: 'element:delete', roomId, elementId, participantId });
  }

  batchCreateElements(roomId: string, elements: WhiteboardElement[]) {
    this.send({ type: 'elements:batchCreate', roomId, elements });
  }

  clearElements(roomId: string, pageId?: string, studentOnly?: boolean) {
    this.send({ type: 'elements:clear', roomId, pageId, studentOnly });
  }

  moveCursor(roomId: string, participantId: string, x: number, y: number) {
    this.send({ type: 'cursor:move', roomId, participantId, x, y });
  }

  lockBoard(roomId: string, isLocked: boolean) {
    this.send({ type: 'board:lock', roomId, isLocked });
  }

  toggleLock(roomId: string, isLocked: boolean) {
    this.lockBoard(roomId, isLocked);
  }

  clearBoard(roomId: string, studentOnly?: boolean) {
    this.clearElements(roomId, undefined, studentOnly);
  }

  kickParticipant(roomId: string, targetParticipantId: string) {
    this.kickUser(roomId, targetParticipantId);
  }

  toggleCursors(roomId: string, showCursors: boolean) {
    this.send({ type: 'board:toggleCursors', roomId, showCursors });
  }

  setWorkMode(roomId: string, workMode: WorkMode) {
    this.send({ type: 'board:setWorkMode', roomId, workMode });
  }

  changePage(roomId: string, pageId: string) {
    this.send({ type: 'board:changePage', roomId, pageId });
  }

  addPage(roomId: string, page: BoardPage) {
    this.send({ type: 'board:addPage', roomId, page });
  }

  deletePage(roomId: string, pageId: string) {
    this.send({ type: 'board:deletePage', roomId, pageId });
  }

  startTimer(roomId: string, duration: number, autoLock: boolean) {
    this.send({ type: 'timer:start', roomId, duration, autoLock });
  }

  pauseTimer(roomId: string) {
    this.send({ type: 'timer:pause', roomId });
  }

  resumeTimer(roomId: string) {
    this.send({ type: 'timer:resume', roomId });
  }

  resetTimer(roomId: string) {
    this.send({ type: 'timer:reset', roomId });
  }

  startChallenge(roomId: string, challenge: ChallengeState) {
    this.send({ type: 'challenge:start', roomId, challenge });
  }

  submitChallenge(roomId: string, submission: ChallengeSubmission) {
    this.send({ type: 'challenge:submit', roomId, submission });
  }

  endChallenge(roomId: string) {
    this.send({ type: 'challenge:end', roomId });
  }

  kickUser(roomId: string, targetParticipantId: string) {
    this.send({ type: 'user:kick', roomId, targetParticipantId });
  }

  renameActivity(roomId: string, newName: string) {
    this.send({ type: 'activity:rename', roomId, newName });
  }
}

export const socketService = new SocketService();
