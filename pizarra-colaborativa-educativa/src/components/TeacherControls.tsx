import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Users,
  Clock,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  FolderHeart,
  Presentation,
  Trash2,
  Copy,
  Check,
  Trophy,
  MousePointer2,
  ChevronDown,
  UserX,
  Layers,
  Plus,
  Edit2,
  Share2,
} from 'lucide-react';
import { Room, Participant, WorkMode, BoardPage } from '../types';
import { formatTime, copyToClipboard } from '../utils/helpers';

interface TeacherControlsProps {
  room: Room;
  currentParticipant: Participant;
  onLockToggle: (isLocked: boolean) => void;
  onToggleCursors: (show: boolean) => void;
  onSetWorkMode: (mode: WorkMode) => void;
  onChangePage: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
  onStartTimer: (seconds: number, autoLock: boolean) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onResetTimer: () => void;
  onClearBoard: (studentOnly: boolean) => void;
  onOpenActivities: () => void;
  onOpenTemplates: () => void;
  onOpenResults: () => void;
  onKickUser: (participantId: string) => void;
  onRenameActivity: (name: string) => void;
  isPresenterMode: boolean;
  onTogglePresenterMode: () => void;
}

export const TeacherControls: React.FC<TeacherControlsProps> = ({
  room,
  currentParticipant,
  onLockToggle,
  onToggleCursors,
  onSetWorkMode,
  onChangePage,
  onAddPage,
  onDeletePage,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
  onClearBoard,
  onOpenActivities,
  onOpenTemplates,
  onOpenResults,
  onKickUser,
  onRenameActivity,
  isPresenterMode,
  onTogglePresenterMode,
}) => {
  const [showParticipants, setShowParticipants] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [customTimerMinutes, setCustomTimerMinutes] = useState('3');
  const [autoLockChecked, setAutoLockChecked] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(room.activityName);

  const participantsList = Object.values(room.participants || {}) as Participant[];
  const studentCount = participantsList.filter((p) => p.role === 'student' && p.isOnline).length;

  const handleCopyCode = async () => {
    await copyToClipboard(room.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/?room=${room.id}`;
    await copyToClipboard(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveTitle = () => {
    if (titleDraft.trim()) {
      onRenameActivity(titleDraft.trim());
      setIsEditingTitle(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-md sm:px-6">
      {/* Left: Room Code & Activity Title */}
      <div className="flex items-center gap-3">
        {/* Room Code Badge */}
        <div className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Sala:</span>
          <span className="font-mono text-base font-black text-blue-900 tracking-wider">{room.id}</span>
          <button
            id="btn-copy-room-code"
            type="button"
            onClick={handleCopyCode}
            title="Copiar código de sala"
            className="ml-1 rounded-md p-1 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            {copiedCode ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {/* Share Link for Google Meet button */}
        <button
          id="btn-share-meet-link"
          type="button"
          onClick={handleCopyLink}
          className="hidden items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors sm:flex"
          title="Copiar enlace directo para compartir en el chat de Google Meet"
        >
          <Share2 className="h-3.5 w-3.5 text-emerald-600" />
          {copiedLink ? '¡Enlace copiado!' : 'Enlace para alumnos'}
        </button>

        {/* Activity Name */}
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="rounded-lg border border-blue-400 px-2 py-1 text-sm font-bold text-slate-800 outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-semibold text-white"
              >
                Guardar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <h1 className="max-w-[150px] truncate text-sm font-bold text-slate-800 sm:max-w-[260px] sm:text-base">
                {room.activityName}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(room.activityName);
                  setIsEditingTitle(true);
                }}
                title="Cambiar nombre de la actividad"
                className="opacity-60 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Timer & Lock & WorkMode */}
      <div className="flex items-center gap-2">
        {/* Timer Control */}
        <div className="relative">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1">
            <Clock className="h-4 w-4 text-slate-500" />
            <span
              className={`font-mono text-sm font-bold ${
                room.timer.remaining <= 10 && room.timer.remaining > 0
                  ? 'text-rose-600 animate-pulse'
                  : 'text-slate-800'
              }`}
            >
              {room.timer.duration > 0 ? formatTime(room.timer.remaining) : '--:--'}
            </span>

            {room.timer.duration > 0 && (
              <div className="flex items-center ml-1">
                {room.timer.isRunning ? (
                  <button
                    type="button"
                    onClick={onPauseTimer}
                    title="Pausar temporizador"
                    className="p-1 text-slate-600 hover:text-slate-900"
                  >
                    <Pause className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onResumeTimer}
                    title="Reanudar temporizador"
                    className="p-1 text-slate-600 hover:text-slate-900"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onResetTimer}
                  title="Reiniciar temporizador"
                  className="p-1 text-slate-400 hover:text-rose-600"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <button
              id="btn-timer-presets"
              type="button"
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              className="ml-1 rounded p-1 text-slate-500 hover:bg-slate-200"
              title="Configurar temporizador"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Timer Dropdown */}
          {showTimerMenu && (
            <div className="absolute left-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Temporizador sincronizado</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: '30 seg', s: 30 },
                  { label: '1 min', s: 60 },
                  { label: '2 min', s: 120 },
                  { label: '5 min', s: 300 },
                  { label: '10 min', s: 600 },
                ].map((item) => (
                  <button
                    key={item.s}
                    type="button"
                    onClick={() => {
                      onStartTimer(item.s, autoLockChecked);
                      setShowTimerMenu(false);
                    }}
                    className="rounded-lg border border-slate-200 py-1 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 border-t border-slate-100 pt-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={autoLockChecked}
                    onChange={(e) => setAutoLockChecked(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Bloquear pizarra al llegar a 0</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Lock / Unlock Toggle Button */}
        <button
          id="btn-lock-board"
          type="button"
          onClick={() => onLockToggle(!room.isLocked)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
            room.isLocked
              ? 'bg-rose-500 text-white hover:bg-rose-600'
              : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
          title={room.isLocked ? 'Desbloquear edición para alumnos' : 'Bloquear pizarra (solo lectura para alumnos)'}
        >
          {room.isLocked ? (
            <>
              <Lock className="h-4 w-4" />
              <span>Bloqueada</span>
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4 text-emerald-600" />
              <span>Desbloqueada</span>
            </>
          )}
        </button>

        {/* Work Mode Selector */}
        <div className="hidden lg:flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => onSetWorkMode('collective')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
              room.workMode === 'collective' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Todos los alumnos trabajan en la misma pizarra"
          >
            Colectiva
          </button>
          <button
            type="button"
            onClick={() => onSetWorkMode('individual')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
              room.workMode === 'individual' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Cada alumno recibe una pizarra individual que el profesor puede supervisar"
          >
            Individual
          </button>
          <button
            type="button"
            onClick={() => onSetWorkMode('teams')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
              room.workMode === 'teams' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Pizarras divididas por equipos"
          >
            Equipos
          </button>
        </div>
      </div>

      {/* Right: Actions, Activities, Templates, Presenter & Participants */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Pages Dropdown */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
          <Layers className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
          <select
            value={room.activePageId}
            onChange={(e) => onChangePage(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            {room.pages.map((p, idx) => (
              <option key={p.id} value={p.id}>
                {p.title || `Página ${idx + 1}`}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onAddPage}
            title="Agregar nueva página"
            className="ml-1.5 rounded p-0.5 text-slate-500 hover:bg-slate-200"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Educational Activities */}
        <button
          id="btn-open-activities"
          type="button"
          onClick={onOpenActivities}
          className="flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
          title="Biblioteca de actividades prediseñadas (Matemáticas, Español, Ciencias)"
        >
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Actividades</span>
        </button>

        {/* My Templates */}
        <button
          id="btn-open-templates"
          type="button"
          onClick={onOpenTemplates}
          className="flex items-center gap-1 rounded-xl border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors"
          title="Guardar o cargar plantillas reutilizables"
        >
          <FolderHeart className="h-4 w-4" />
          <span className="hidden md:inline">Mis actividades</span>
        </button>

        {/* Results / Challenge Leaderboard */}
        {room.challenge && (
          <button
            id="btn-open-results"
            type="button"
            onClick={onOpenResults}
            className="flex items-center gap-1 rounded-xl bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-amber-600 shadow-xs transition-colors"
            title="Ver ranking y respuestas del reto"
          >
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Resultados</span>
          </button>
        )}

        {/* Clean Student Responses */}
        <button
          id="btn-clean-responses"
          type="button"
          onClick={() => onClearBoard(true)}
          className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 hover:text-amber-700"
          title="Limpiar respuestas de alumnos (mantiene la actividad base)"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        {/* Toggle Cursors */}
        <button
          id="btn-toggle-cursors"
          type="button"
          onClick={() => onToggleCursors(!room.showCursors)}
          className={`rounded-xl border p-2 transition-colors ${
            room.showCursors
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-slate-200 bg-slate-50 text-slate-400'
          }`}
          title={room.showCursors ? 'Cursores de alumnos visibles' : 'Cursores de alumnos ocultos'}
        >
          <MousePointer2 className="h-4 w-4" />
        </button>

        {/* Presenter / Google Meet Mode Toggle */}
        <button
          id="btn-presenter-mode"
          type="button"
          onClick={onTogglePresenterMode}
          className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
            isPresenterMode
              ? 'bg-indigo-600 text-white shadow-md'
              : 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
          title="Vista optimizada para compartir pantalla en Google Meet"
        >
          <Presentation className="h-4 w-4" />
          <span className="hidden lg:inline">Vista Meet</span>
        </button>

        {/* Participants count & drawer */}
        <div className="relative">
          <button
            id="btn-participants-list"
            type="button"
            onClick={() => setShowParticipants(!showParticipants)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
            title="Ver alumnos conectados"
          >
            <Users className="h-4 w-4 text-slate-500" />
            <span>{studentCount}</span>
          </button>

          {showParticipants && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Participantes ({participantsList.length})
                </span>
                <span className="text-xs text-emerald-600 font-semibold">{studentCount} en línea</span>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {participantsList.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs"
                        style={{ backgroundColor: p.color || '#3b82f6' }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          {p.name}
                          {p.role === 'teacher' && (
                            <span className="rounded bg-blue-100 px-1 py-0.2 text-[10px] text-blue-700">Profesor</span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {p.isOnline ? '🟢 En línea' : '⚪ Desconectado'}
                        </span>
                      </div>
                    </div>

                    {p.role === 'student' && (
                      <button
                        type="button"
                        onClick={() => onKickUser(p.id)}
                        className="rounded p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                        title="Expulsar alumno de la sala"
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
