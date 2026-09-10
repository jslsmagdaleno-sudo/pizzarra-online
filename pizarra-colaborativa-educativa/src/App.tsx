import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Room,
  Participant,
  ToolType,
  WhiteboardElement,
  ActivityTemplate,
  WorkMode,
  ChallengeSubmission,
  BoardPage,
} from './types';
import { socketService } from './services/socketService';
import { HomeView, TeacherDashboard, CreateRoomView, StudentJoinView } from './components/EntryViews';
import { TeacherControls } from './components/TeacherControls';
import { StudentHeader } from './components/StudentHeader';
import { Toolbar } from './components/Toolbar';
import { WhiteboardCanvas } from './components/WhiteboardCanvas';
import { ActivitiesModal } from './components/ActivitiesModal';
import { MyTemplatesModal } from './components/MyTemplatesModal';
import { ResultsModal } from './components/ResultsModal';
import { PresenterHUD } from './components/PresenterHUD';
import { getRandomColor } from './utils/helpers';
import { DEFAULT_ACTIVITIES } from './data/defaultActivities';

type AppView = 'home' | 'teacher_dashboard' | 'create_room' | 'student_join' | 'whiteboard';

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [room, setRoom] = useState<Room | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [teacherKey, setTeacherKey] = useState<string | null>(null);
  const [initialRoomParam, setInitialRoomParam] = useState<string>('');

  // Whiteboard drawing tools state
  const [currentTool, setCurrentTool] = useState<ToolType>('pencil');
  const [currentColor, setCurrentColor] = useState<string>('#2563eb');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Modals state
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [isPresenterMode, setIsPresenterMode] = useState(false);

  // Individual mode student viewing
  const [selectedStudentViewId, setSelectedStudentViewId] = useState<string>('');

  // Undo / Redo history
  const [historyStack, setHistoryStack] = useState<
    Array<{ element: WhiteboardElement; action: 'create' | 'delete' | 'update'; prev?: WhiteboardElement }>
  >([]);
  const [redoStack, setRedoStack] = useState<
    Array<{ element: WhiteboardElement; action: 'create' | 'delete' | 'update'; prev?: WhiteboardElement }>
  >([]);

  const currentParticipantRef = useRef<Participant | null>(null);
  useEffect(() => {
    currentParticipantRef.current = currentParticipant;
  }, [currentParticipant]);

  // 1. Check URL parameters for direct join links (e.g. ?room=7K4P2)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomParam(roomParam.toUpperCase());
      setView('student_join');
    }
  }, []);

  // 2. Setup WebSocket event listeners
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      socketService.on('room:state', (data: any) => {
        const fullRoom: Room = data?.room || data;
        if (fullRoom && fullRoom.id) {
          setRoom({
            ...fullRoom,
            elements: fullRoom.elements || {},
            participants: fullRoom.participants || {},
            pages: fullRoom.pages || [{ id: 'page-1', title: 'Página 1' }],
          });
        }
      })
    );

    unsubs.push(
      socketService.on('element:created', (data: any) => {
        const element: WhiteboardElement = data?.element || data;
        if (!element || !element.id) return;
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            elements: { ...(prev.elements || {}), [element.id]: element },
          };
        });
      })
    );

    unsubs.push(
      socketService.on('element:updated', (data: any) => {
        const elementId = data?.elementId || data?.id;
        const changes = data?.changes || data?.updates;
        if (!elementId || !changes) return;
        setRoom((prev) => {
          if (!prev || !prev.elements || !prev.elements[elementId]) return prev;
          return {
            ...prev,
            elements: {
              ...prev.elements,
              [elementId]: { ...prev.elements[elementId], ...changes, updatedAt: Date.now() },
            },
          };
        });
      })
    );

    unsubs.push(
      socketService.on('element:deleted', (data: any) => {
        const elementId = typeof data === 'string' ? data : (data?.elementId || data?.id);
        if (!elementId) return;
        setRoom((prev) => {
          if (!prev) return null;
          const copy = { ...(prev.elements || {}) };
          delete copy[elementId];
          return { ...prev, elements: copy };
        });
      })
    );

    unsubs.push(
      socketService.on('elements:batchCreated', (data: any) => {
        const elements: WhiteboardElement[] = data?.elements || data;
        if (!Array.isArray(elements)) return;
        setRoom((prev) => {
          if (!prev) return null;
          const newElements = { ...(prev.elements || {}) };
          elements.forEach((el) => {
            if (el && el.id) newElements[el.id] = el;
          });
          return { ...prev, elements: newElements };
        });
      })
    );

    unsubs.push(
      socketService.on('elements:cleared', (data: any) => {
        const studentOnly = Boolean(data?.studentOnly);
        setRoom((prev) => {
          if (!prev) return null;
          if (!studentOnly) {
            return { ...prev, elements: {} };
          }
          // Filter out student elements
          const filtered: Record<string, WhiteboardElement> = {};
          (Object.values(prev.elements || {}) as WhiteboardElement[]).forEach((el: WhiteboardElement) => {
            if (el.creatorRole !== 'student' || el.isLocked) {
              filtered[el.id] = el;
            }
          });
          return { ...prev, elements: filtered };
        });
      })
    );

    unsubs.push(
      socketService.on('participant:joined', (data: any) => {
        const participant: Participant = data?.participant || data;
        if (!participant || !participant.id) return;
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            participants: { ...(prev.participants || {}), [participant.id]: participant },
          };
        });
      })
    );

    unsubs.push(
      socketService.on('participant:left', (data: any) => {
        const participantId = typeof data === 'string' ? data : data?.participantId;
        if (!participantId) return;
        setRoom((prev) => {
          if (!prev) return null;
          const copy = { ...(prev.participants || {}) };
          if (copy[participantId]) {
            copy[participantId] = { ...copy[participantId], isOnline: false };
          }
          return { ...prev, participants: copy };
        });
      })
    );

    unsubs.push(
      socketService.on('participant:kicked', (data: any) => {
        const participantId = typeof data === 'string' ? data : data?.participantId;
        if (currentParticipantRef.current?.id === participantId) {
          alert('Has sido retirado de la clase por el profesor.');
          handleLeaveRoom();
        }
      })
    );

    unsubs.push(
      socketService.on('cursor:moved', (data: any) => {
        const { participantId, x, y } = data || {};
        if (!participantId || x === undefined || y === undefined) return;
        setRoom((prev) => {
          if (!prev || !prev.participants || !prev.participants[participantId]) return prev;
          return {
            ...prev,
            participants: {
              ...prev.participants,
              [participantId]: {
                ...prev.participants[participantId],
                cursor: { x, y },
              },
            },
          };
        });
      })
    );

    unsubs.push(
      socketService.on('board:locked', (data: any) => {
        const isLocked = typeof data === 'boolean' ? data : Boolean(data?.isLocked);
        setRoom((prev) => (prev ? { ...prev, isLocked } : null));
      })
    );

    const onCursorsToggled = (data: any) => {
      const showCursors = typeof data === 'boolean' ? data : Boolean(data?.showCursors);
      setRoom((prev) => (prev ? { ...prev, showCursors } : null));
    };
    unsubs.push(socketService.on('board:cursorsToggled', onCursorsToggled));
    unsubs.push(socketService.on('board:cursors_toggled', onCursorsToggled));

    const onPageChanged = (data: any) => {
      const pageId = typeof data === 'string' ? data : data?.pageId;
      if (pageId) setRoom((prev) => (prev ? { ...prev, activePageId: pageId } : null));
    };
    unsubs.push(socketService.on('board:pageChanged', onPageChanged));
    unsubs.push(socketService.on('board:page_changed', onPageChanged));

    unsubs.push(
      socketService.on('board:pageAdded', (data: any) => {
        const page: BoardPage = data?.page || data;
        if (page && page.id) {
          setRoom((prev) => (prev ? { ...prev, pages: [...prev.pages, page] } : null));
        }
      })
    );

    unsubs.push(
      socketService.on('board:pageDeleted', (data: any) => {
        const pageId = typeof data === 'string' ? data : data?.pageId;
        if (pageId) {
          setRoom((prev) => {
            if (!prev) return null;
            const pages = prev.pages.filter((p) => p.id !== pageId);
            const activePageId = prev.activePageId === pageId ? pages[0]?.id || 'page-1' : prev.activePageId;
            return { ...prev, pages, activePageId };
          });
        }
      })
    );

    const onWorkModeChanged = (data: any) => {
      const workMode: WorkMode = typeof data === 'string' ? data : data?.workMode;
      const pages = data?.pages;
      if (workMode) {
        setRoom((prev) => (prev ? { ...prev, workMode, ...(pages ? { pages } : {}) } : null));
      }
    };
    unsubs.push(socketService.on('board:workModeChanged', onWorkModeChanged));
    unsubs.push(socketService.on('board:workmode_changed', onWorkModeChanged));

    const onTimerSync = (data: any) => {
      const timer = data?.timer || data;
      if (timer) {
        setRoom((prev) => (prev ? { ...prev, timer } : null));
      }
    };
    unsubs.push(socketService.on('timer:sync', onTimerSync));
    unsubs.push(socketService.on('timer:updated', onTimerSync));

    const onChallengeUpdated = (data: any) => {
      const challenge = data?.challenge !== undefined ? data.challenge : data;
      setRoom((prev) => (prev ? { ...prev, challenge } : null));
      if (challenge?.isActive) {
        setShowResultsModal(false);
      }
    };
    unsubs.push(socketService.on('challenge:updated', onChallengeUpdated));
    unsubs.push(socketService.on('challenge:started', onChallengeUpdated));

    unsubs.push(
      socketService.on('activity:renamed', (data: any) => {
        const newName = typeof data === 'string' ? data : data?.newName;
        if (newName) setRoom((prev) => (prev ? { ...prev, activityName: newName } : null));
      })
    );

    unsubs.push(
      socketService.on('challenge:submission', (submission: ChallengeSubmission) => {
        setRoom((prev) => {
          if (!prev || !prev.challenge) return prev;
          return {
            ...prev,
            challenge: {
              ...prev.challenge,
              submissions: {
                ...(prev.challenge.submissions || {}),
                [submission.studentId]: submission,
              },
            },
          };
        });
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  // Connect socket and join room
  const connectAndJoin = async (
    targetRoomId: string,
    participant: Participant,
    key?: string
  ) => {
    socketService.connect();
    // Wait slightly for socket open
    setTimeout(() => {
      socketService.joinRoom(targetRoomId, participant, key);
      setCurrentParticipant(participant);
      if (key) setTeacherKey(key);
      setView('whiteboard');
    }, 150);
  };

  // Handler: Create Room as Teacher
  const handleCreateRoom = async (
    name: string,
    templateId?: string
  ): Promise<{ roomId: string; teacherKey: string } | null> => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityName: name, templateId }),
      });
      if (!res.ok) throw new Error('Error al crear la sala');
      const data = await res.json();
      return { roomId: data.roomId, teacherKey: data.teacherKey };
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // Handler: Enter room as Teacher after creation
  const handleEnterCreatedRoom = (roomId: string, key: string) => {
    const teacher: Participant = {
      id: 'teacher_' + Math.random().toString(36).substring(2, 7),
      name: 'Profesor(a)',
      role: 'teacher',
      color: '#2563eb',
      lastSeen: Date.now(),
      joinedAt: Date.now(),
      isOnline: true,
    };
    connectAndJoin(roomId, teacher, key);
  };

  // Handler: Join existing room as Teacher
  const handleJoinAsTeacher = async (code: string) => {
    try {
      const res = await fetch(`/api/rooms/${code}`);
      if (!res.ok) {
        alert('No se encontró la sala con el código ' + code);
        return;
      }
      const teacher: Participant = {
        id: 'teacher_' + Math.random().toString(36).substring(2, 7),
        name: 'Profesor(a)',
        role: 'teacher',
        color: '#2563eb',
        lastSeen: Date.now(),
        joinedAt: Date.now(),
        isOnline: true,
      };
      connectAndJoin(code, teacher);
    } catch (err) {
      alert('Error al verificar la sala');
    }
  };

  // Handler: Join as Student (name + room code)
  const handleStudentJoin = async (studentName: string, roomId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) {
        alert('No se encontró ninguna clase con el código ' + roomId + '. Verifica con tu profesor.');
        return;
      }

      const student: Participant = {
        id: 'student_' + Math.random().toString(36).substring(2, 8),
        name: studentName,
        role: 'student',
        color: getRandomColor(),
        lastSeen: Date.now(),
        joinedAt: Date.now(),
        isOnline: true,
      };

      connectAndJoin(roomId, student);
    } catch (err) {
      alert('Error de conexión con la sala');
    }
  };

  // History Undo / Redo
  const recordHistory = (
    element: WhiteboardElement,
    action: 'create' | 'delete' | 'update',
    prev?: WhiteboardElement
  ) => {
    setHistoryStack((s) => [...s, { element, action, prev }]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (!room || historyStack.length === 0) return;
    const last = historyStack[historyStack.length - 1];
    setHistoryStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, last]);

    if (last.action === 'create') {
      socketService.deleteElement(room.id, last.element.id, currentParticipant?.id || '');
    } else if (last.action === 'delete') {
      socketService.createElement(room.id, last.element);
    } else if (last.action === 'update' && last.prev) {
      socketService.updateElement(room.id, last.element.id, last.prev);
    }
  };

  const handleDeleteSelected = () => {
    if (!room || !selectedElementId) return;
    const el = room.elements[selectedElementId];
    if (!el) return;
    recordHistory(el, 'delete');
    socketService.deleteElement(room.id, el.id, currentParticipant?.id || '');
    setSelectedElementId(null);
  };

  const handleRedo = () => {
    if (!room || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setHistoryStack((s) => [...s, next]);

    if (next.action === 'create') {
      socketService.createElement(room.id, next.element);
    } else if (next.action === 'delete') {
      socketService.deleteElement(room.id, next.element.id, currentParticipant?.id || '');
    } else if (next.action === 'update') {
      socketService.updateElement(room.id, next.element.id, next.element);
    }
  };

  // Teacher actions
  const handleLockToggle = (isLocked: boolean) => {
    if (!room) return;
    socketService.toggleLock(room.id, isLocked);
  };

  const handleToggleCursors = (show: boolean) => {
    if (!room) return;
    socketService.toggleCursors(room.id, show);
  };

  const handleSetWorkMode = (mode: WorkMode) => {
    if (!room) return;
    socketService.setWorkMode(room.id, mode);
  };

  const handleChangePage = (pageId: string) => {
    if (!room) return;
    socketService.changePage(room.id, pageId);
  };

  const handleAddPage = () => {
    if (!room) return;
    const newPageNumber = room.pages.length + 1;
    const newPageId = 'page_' + Date.now();
    const updatedPages = [...room.pages, { id: newPageId, title: `Página ${newPageNumber}` }];

    // Update room page list
    setRoom({
      ...room,
      pages: updatedPages,
      activePageId: newPageId,
    });
    socketService.changePage(room.id, newPageId);
  };

  const handleDeletePage = (pageId: string) => {
    if (!room || room.pages.length <= 1) return;
    const filtered = room.pages.filter((p) => p.id !== pageId);
    setRoom({
      ...room,
      pages: filtered,
      activePageId: filtered[0].id,
    });
    socketService.changePage(room.id, filtered[0].id);
  };

  const handleStartTimer = (seconds: number, autoLock: boolean) => {
    if (!room) return;
    socketService.startTimer(room.id, seconds, autoLock);
  };

  const handlePauseTimer = () => {
    if (!room) return;
    socketService.pauseTimer(room.id);
  };

  const handleResumeTimer = () => {
    if (!room) return;
    socketService.resumeTimer(room.id);
  };

  const handleResetTimer = () => {
    if (!room) return;
    socketService.resetTimer(room.id);
  };

  const handleClearBoard = (studentOnly: boolean) => {
    if (!room) return;
    socketService.clearBoard(room.id, studentOnly);
  };

  const handleKickUser = (participantId: string) => {
    if (!room) return;
    socketService.kickParticipant(room.id, participantId);
  };

  const handleRenameActivity = (name: string) => {
    if (!room) return;
    setRoom({ ...room, activityName: name });
  };

  // Load activity template into board
  const handleLoadActivity = (activity: ActivityTemplate, startAsChallenge: boolean) => {
    if (!room) return;

    // Clear board first to give a clean activity canvas
    socketService.clearBoard(room.id, false);

    // Create all template elements with current page ID
    activity.elements.forEach((templateEl, index) => {
      const newEl: WhiteboardElement = {
        ...templateEl,
        id: `template_${Date.now()}_${index}`,
        pageId: room.activePageId,
        creatorId: currentParticipant?.id || 'teacher',
        creatorName: currentParticipant?.name || 'Profesor',
        creatorRole: 'teacher',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      socketService.createElement(room.id, newEl);
    });

    if (startAsChallenge && activity.challenge) {
      socketService.startChallenge(room.id, {
        ...activity.challenge,
        isActive: true,
        submissions: {},
        startedAt: Date.now(),
      });
    }
  };

  // Load custom template
  const handleLoadCustomTemplate = (template: ActivityTemplate) => {
    if (!room) return;
    socketService.clearBoard(room.id, false);
    template.elements.forEach((templateEl, index) => {
      const newEl: WhiteboardElement = {
        ...templateEl,
        id: `custom_${Date.now()}_${index}`,
        pageId: room.activePageId,
        creatorId: currentParticipant?.id || 'teacher',
        creatorName: currentParticipant?.name || 'Profesor',
        creatorRole: 'teacher',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      socketService.createElement(room.id, newEl);
    });
  };

  const handleLeaveRoom = () => {
    socketService.disconnect();
    setRoom(null);
    setCurrentParticipant(null);
    setView('home');
  };

  // Determine active canvas page
  const activeCanvasPageId =
    room?.workMode === 'individual' && currentParticipant?.role === 'student'
      ? `page_${currentParticipant.id}`
      : room?.workMode === 'individual' && currentParticipant?.role === 'teacher' && selectedStudentViewId
      ? `page_${selectedStudentViewId}`
      : room?.activePageId || 'page_1';

  // Render Views
  if (view === 'home') {
    return (
      <HomeView
        onSelectTeacher={() => setView('teacher_dashboard')}
        onSelectStudent={() => setView('student_join')}
      />
    );
  }

  if (view === 'teacher_dashboard') {
    return (
      <TeacherDashboard
        onBack={() => setView('home')}
        onGoToCreate={() => setView('create_room')}
        onOpenTemplates={() => setShowTemplatesModal(true)}
        onJoinAsTeacher={handleJoinAsTeacher}
      />
    );
  }

  if (view === 'create_room') {
    return (
      <CreateRoomView
        onBack={() => setView('teacher_dashboard')}
        onCreateRoom={handleCreateRoom}
        onEnterRoom={handleEnterCreatedRoom}
      />
    );
  }

  if (view === 'student_join') {
    return (
      <StudentJoinView
        initialRoomId={initialRoomParam}
        onBack={() => setView('home')}
        onJoin={handleStudentJoin}
      />
    );
  }

  // Active Whiteboard View (Pantalla 5 / Sala en vivo)
  if (view === 'whiteboard') {
    if (!room || !currentParticipant) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-100 gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="font-semibold text-slate-700">Conectando con la sala de clase...</p>
        </div>
      );
    }

    const isTeacher = currentParticipant.role === 'teacher';
    const studentsList: Participant[] = (Object.values(room.participants || {}) as Participant[]).filter(
      (p: Participant) => p && p.role === 'student'
    );

    return (
      <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-100">
        {/* Presenter Mode Floating HUD or Standard Top Bar */}
        {isPresenterMode && isTeacher ? (
          <PresenterHUD
            room={room}
            onExitPresenterMode={() => setIsPresenterMode(false)}
            onLockToggle={handleLockToggle}
            onClearBoard={() => handleClearBoard(true)}
            onChangePage={handleChangePage}
            onOpenResults={() => setShowResultsModal(true)}
          />
        ) : isTeacher ? (
          <TeacherControls
            room={room}
            currentParticipant={currentParticipant}
            onLockToggle={handleLockToggle}
            onToggleCursors={handleToggleCursors}
            onSetWorkMode={handleSetWorkMode}
            onChangePage={handleChangePage}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            onStartTimer={handleStartTimer}
            onPauseTimer={handlePauseTimer}
            onResumeTimer={handleResumeTimer}
            onResetTimer={handleResetTimer}
            onClearBoard={handleClearBoard}
            onOpenActivities={() => setShowActivitiesModal(true)}
            onOpenTemplates={() => setShowTemplatesModal(true)}
            onOpenResults={() => setShowResultsModal(true)}
            onKickUser={handleKickUser}
            onRenameActivity={handleRenameActivity}
            isPresenterMode={isPresenterMode}
            onTogglePresenterMode={() => setIsPresenterMode(true)}
          />
        ) : (
          <StudentHeader
            activityName={room.activityName}
            roomId={room.id}
            student={currentParticipant}
            timer={room.timer}
            isLocked={room.isLocked}
            onLeave={handleLeaveRoom}
          />
        )}

        {/* Individual Work Mode Banner: If teacher is reviewing students */}
        {isTeacher && room.workMode === 'individual' && (
          <div className="flex items-center justify-between border-b border-indigo-200 bg-indigo-50 px-6 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                Modo Individual:
              </span>
              <span className="text-xs text-indigo-950 font-medium">
                Viendo la pizarra de:
              </span>
              <select
                value={selectedStudentViewId}
                onChange={(e) => setSelectedStudentViewId(e.target.value)}
                className="rounded-lg border border-indigo-300 bg-white px-3 py-1 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="">Pizarra General</option>
                {studentsList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.isOnline ? 'En línea' : 'Desconectado'})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-indigo-700">
              Cada alumno trabaja de forma independiente sin ver las respuestas de sus compañeros.
            </p>
          </div>
        )}

        {/* Whiteboard Main Stage & Floating Toolbar */}
        <main className="relative flex-1 overflow-hidden">
          <WhiteboardCanvas
            roomId={room.id}
            elements={room.elements || {}}
            pageId={activeCanvasPageId}
            currentParticipant={currentParticipant}
            otherParticipants={(Object.values(room.participants || {}) as Participant[]).filter(
              (p: Participant) => p && p.id !== currentParticipant.id
            )}
            currentTool={currentTool}
            currentColor={currentColor}
            strokeWidth={strokeWidth}
            isLocked={room.isLocked}
            showCursors={room.showCursors}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onRecordHistory={recordHistory}
            challenge={room.challenge}
            onSubmitChallenge={(sub) => socketService.submitChallenge(room.id, sub)}
          />

          {/* Floating Whiteboard Toolbar */}
          <Toolbar
            currentTool={currentTool}
            currentColor={currentColor}
            strokeWidth={strokeWidth}
            setTool={setCurrentTool}
            setColor={setCurrentColor}
            setStrokeWidth={setStrokeWidth}
            canUndo={historyStack.length > 0}
            canRedo={redoStack.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
            selectedElementId={selectedElementId}
            onDeleteSelected={handleDeleteSelected}
            isLocked={room.isLocked && !isTeacher}
            isTeacher={isTeacher}
          />
        </main>

        {/* Modals */}
        <ActivitiesModal
          isOpen={showActivitiesModal}
          onClose={() => setShowActivitiesModal(false)}
          onLoadActivity={handleLoadActivity}
        />

        <MyTemplatesModal
          isOpen={showTemplatesModal}
          onClose={() => setShowTemplatesModal(false)}
          currentElements={room.elements}
          activePageId={room.activePageId}
          activityName={room.activityName}
          onLoadTemplate={handleLoadCustomTemplate}
        />

        <ResultsModal
          isOpen={showResultsModal}
          onClose={() => setShowResultsModal(false)}
          challenge={room.challenge}
          isTeacher={isTeacher}
          onRestartChallenge={() => {
            if (room.challenge) {
              socketService.startChallenge(room.id, {
                ...room.challenge,
                startedAt: Date.now(),
                submissions: {},
              });
            }
          }}
        />
      </div>
    );
  }

  return null;
}
