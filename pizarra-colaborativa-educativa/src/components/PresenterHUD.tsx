import React from 'react';
import {
  Lock,
  Unlock,
  Users,
  Clock,
  Trash2,
  ChevronRight,
  ChevronLeft,
  X,
  Trophy,
} from 'lucide-react';
import { Room, Participant } from '../types';
import { formatTime } from '../utils/helpers';

interface PresenterHUDProps {
  room: Room;
  onExitPresenterMode: () => void;
  onLockToggle: (isLocked: boolean) => void;
  onClearBoard: () => void;
  onChangePage: (pageId: string) => void;
  onOpenResults: () => void;
}

export const PresenterHUD: React.FC<PresenterHUDProps> = ({
  room,
  onExitPresenterMode,
  onLockToggle,
  onClearBoard,
  onChangePage,
  onOpenResults,
}) => {
  const onlineStudents = (Object.values(room.participants || {}) as Participant[]).filter(
    (p: Participant) => p && p.role === 'student' && p.isOnline
  );

  const currentPageIndex = room.pages.findIndex((p) => p.id === room.activePageId);

  const handleNextPage = () => {
    if (currentPageIndex < room.pages.length - 1) {
      onChangePage(room.pages[currentPageIndex + 1].id);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      onChangePage(room.pages[currentPageIndex - 1].id);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-col items-center p-4">
      {/* Top Floating Meet Card */}
      <div className="pointer-events-auto flex items-center justify-between gap-4 rounded-3xl border-2 border-slate-800 bg-slate-900/95 px-6 py-3 text-white shadow-2xl backdrop-blur-md">
        {/* Left: Code & Title */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500 px-3 py-1 font-mono text-base font-black tracking-wider text-white">
            {room.id}
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-white">
              {room.activityName}
            </h2>
            <span className="text-[11px] font-semibold text-slate-400">
              Modo Presentación Google Meet
            </span>
          </div>
        </div>

        {/* Center: Live Stats (Timer, Connected Students) */}
        <div className="flex items-center gap-4 border-x border-slate-700 px-4">
          {/* Timer */}
          <div className="flex items-center gap-1.5 font-mono text-base font-black">
            <Clock className="h-4 w-4 text-amber-400" />
            <span
              className={
                room.timer.remaining <= 10 && room.timer.remaining > 0
                  ? 'text-rose-400 animate-pulse'
                  : 'text-white'
              }
            >
              {room.timer.duration > 0 ? formatTime(room.timer.remaining) : '--:--'}
            </span>
          </div>

          {/* Students Pill */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
              <Users className="h-4 w-4" />
              <span>{onlineStudents.length} alumnos</span>
            </div>
            {/* Avatars preview */}
            <div className="flex -space-x-1.5 overflow-hidden">
              {onlineStudents.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-slate-900"
                  style={{ backgroundColor: s.color || '#3b82f6' }}
                  title={s.name}
                >
                  {s.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-2">
          {/* Lock / Unlock */}
          <button
            type="button"
            onClick={() => onLockToggle(!room.isLocked)}
            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              room.isLocked
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {room.isLocked ? (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>Bloqueada</span>
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5 text-emerald-400" />
                <span>Abierta</span>
              </>
            )}
          </button>

          {/* Clean board */}
          <button
            type="button"
            onClick={onClearBoard}
            title="Limpiar respuestas de alumnos"
            className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          {/* Page nav */}
          {room.pages.length > 1 && (
            <div className="flex items-center rounded-xl bg-slate-800 p-0.5 text-xs font-bold text-slate-300">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPageIndex === 0}
                className="p-1 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-1.5">
                {currentPageIndex + 1}/{room.pages.length}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPageIndex === room.pages.length - 1}
                className="p-1 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Results button */}
          {room.challenge && (
            <button
              type="button"
              onClick={onOpenResults}
              className="flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-black text-amber-950 hover:bg-amber-400 transition-colors"
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>Resultados</span>
            </button>
          )}

          {/* Exit Meet View */}
          <button
            type="button"
            onClick={onExitPresenterMode}
            title="Salir de la vista Meet"
            className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:bg-rose-900/60 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
