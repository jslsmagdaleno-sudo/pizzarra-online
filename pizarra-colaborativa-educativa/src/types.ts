/**
 * Types for Collaborative Educational Whiteboard
 */

export interface Point {
  x: number;
  y: number;
}

export type ToolType =
  | 'select'
  | 'pencil'
  | 'marker'
  | 'eraser'
  | 'text'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'star'
  | 'sticky'
  | 'card';

export interface WhiteboardElement {
  id: string;
  pageId: string;
  type: 'stroke' | 'text' | 'rect' | 'circle' | 'line' | 'arrow' | 'star' | 'sticky' | 'card' | 'badge';
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: Point[];
  color: string;
  fillColor?: string;
  strokeWidth: number;
  opacity?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  creatorId: string;
  creatorName: string;
  creatorRole: 'teacher' | 'student';
  isLocked?: boolean; // When true, only teacher can move or delete
  isTemplateItem?: boolean;
  category?: string; // for classification tasks
  value?: string | number; // for sorting/math tasks
  orderIndex?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Participant {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  color: string;
  isOnline: boolean;
  lastSeen: number;
  joinedAt?: number;
  cursor?: { x: number; y: number };
  teamId?: string; // 'team_a' | 'team_b' | 'team_c' etc.
  assignedPageId?: string; // for individual workspaces
}

export interface TimerState {
  duration: number; // total seconds
  remaining: number; // remaining seconds
  isRunning: boolean;
  autoLockOnZero: boolean;
  startedAt?: number;
}

export interface ChallengeSubmission {
  studentId: string;
  studentName: string;
  score: number;
  errors: number;
  timeSeconds: number;
  completedAt: number;
  isCorrect: boolean;
}

export interface ChallengeState {
  id: string;
  title: string;
  instructions: string;
  type: 'order_numbers' | 'classify_words' | 'compare_signs' | 'match_pairs' | 'general';
  correctOrder?: string[];
  expectedAnswers?: Record<string, string>; // item value -> expected category
  submissions: Record<string, ChallengeSubmission>;
  isActive: boolean;
  startedAt?: number;
}

export interface BoardPage {
  id: string;
  title: string;
  background: 'grid' | 'dots' | 'lined' | 'blank';
  teamId?: string;
  ownerStudentId?: string;
}

export type WorkMode = 'collective' | 'individual' | 'teams';

export interface Room {
  id: string; // short code e.g. 7K4P2
  activityName: string;
  createdAt: number;
  teacherKey: string;
  isLocked: boolean;
  showCursors: boolean;
  allowStudentEraseOthers: boolean;
  workMode: WorkMode;
  activePageId: string;
  pages: BoardPage[];
  elements: Record<string, WhiteboardElement>;
  participants: Record<string, Participant>;
  timer: TimerState;
  challenge?: ChallengeState;
}

export interface ActivityTemplate {
  id: string;
  title: string;
  subject: 'matematicas' | 'espanol' | 'ciencias';
  grade: string;
  description: string;
  elements: Omit<WhiteboardElement, 'id' | 'pageId' | 'createdAt' | 'updatedAt'>[];
  challenge?: Omit<ChallengeState, 'submissions' | 'isActive'>;
  isCustom?: boolean;
}

// WebSocket Event Types
export type ClientEvent =
  | { type: 'join'; roomId: string; participant: Omit<Participant, 'isOnline' | 'lastSeen'>; teacherKey?: string }
  | { type: 'leave'; roomId: string; participantId: string }
  | { type: 'element:create'; roomId: string; element: WhiteboardElement }
  | { type: 'element:update'; roomId: string; elementId: string; changes: Partial<WhiteboardElement> }
  | { type: 'element:delete'; roomId: string; elementId: string; participantId: string }
  | { type: 'elements:batchCreate'; roomId: string; elements: WhiteboardElement[] }
  | { type: 'elements:clear'; roomId: string; pageId?: string; studentOnly?: boolean }
  | { type: 'cursor:move'; roomId: string; participantId: string; x: number; y: number }
  | { type: 'board:lock'; roomId: string; isLocked: boolean }
  | { type: 'board:toggleCursors'; roomId: string; showCursors: boolean }
  | { type: 'board:setWorkMode'; roomId: string; workMode: WorkMode }
  | { type: 'board:changePage'; roomId: string; pageId: string }
  | { type: 'board:addPage'; roomId: string; page: BoardPage }
  | { type: 'board:deletePage'; roomId: string; pageId: string }
  | { type: 'timer:start'; roomId: string; duration: number; autoLock: boolean }
  | { type: 'timer:pause'; roomId: string }
  | { type: 'timer:resume'; roomId: string }
  | { type: 'timer:reset'; roomId: string }
  | { type: 'challenge:start'; roomId: string; challenge: ChallengeState }
  | { type: 'challenge:submit'; roomId: string; submission: ChallengeSubmission }
  | { type: 'challenge:end'; roomId: string }
  | { type: 'user:kick'; roomId: string; targetParticipantId: string }
  | { type: 'activity:rename'; roomId: string; newName: string }
  | { type: 'ping' };

export type ServerEvent =
  | { type: 'room:state'; room: Room }
  | { type: 'participant:joined'; participant: Participant }
  | { type: 'participant:left'; participantId: string }
  | { type: 'participant:kicked'; participantId: string }
  | { type: 'element:created'; element: WhiteboardElement }
  | { type: 'element:updated'; elementId: string; changes: Partial<WhiteboardElement> }
  | { type: 'element:deleted'; elementId: string }
  | { type: 'elements:batchCreated'; elements: WhiteboardElement[] }
  | { type: 'elements:cleared'; pageId?: string; studentOnly?: boolean }
  | { type: 'cursor:moved'; participantId: string; x: number; y: number }
  | { type: 'board:locked'; isLocked: boolean }
  | { type: 'board:cursorsToggled'; showCursors: boolean }
  | { type: 'board:workModeChanged'; workMode: WorkMode; pages?: BoardPage[] }
  | { type: 'board:pageChanged'; pageId: string }
  | { type: 'board:pageAdded'; page: BoardPage }
  | { type: 'board:pageDeleted'; pageId: string }
  | { type: 'timer:sync'; timer: TimerState }
  | { type: 'challenge:updated'; challenge?: ChallengeState }
  | { type: 'activity:renamed'; newName: string }
  | { type: 'error'; message: string }
  | { type: 'pong' };
