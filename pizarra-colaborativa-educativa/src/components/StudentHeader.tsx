import React from 'react';
import { Clock, Lock, LogOut, Wifi } from 'lucide-react';
import { Participant, TimerState } from '../types';
import { formatTime } from '../utils/helpers';

interface StudentHeaderProps {
  activityName: string;
  roomId: string;
  student: Participant;
  timer: TimerState;
  isLocked: boolean;
  onLeave: () => void;
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({
  activityName,
  roomId,
  student,
  timer,
  isLocked,
  onLeave,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-md">
      {/* Student Identity */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-black text-white shadow-sm"
          style={{ backgroundColor: student.color || '#10b981' }}
        >
          {student.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-slate-800">{student.name}</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <Wifi className="h-3 w-3" /> En vivo
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Sala <span className="font-mono font-bold text-blue-600">{roomId}</span>
          </span>
        </div>
      </div>

      {/* Activity Title & Timer */}
      <div className="flex items-center gap-3">
        <h2 className="hidden text-sm font-black text-slate-700 sm:block">{activityName}</h2>

        {timer.duration > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-sm font-bold">
            <Clock className="h-4 w-4 text-slate-500" />
            <span
              className={
                timer.remaining <= 10 && timer.remaining > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-800'
              }
            >
              {formatTime(timer.remaining)}
            </span>
          </div>
        )}

        {isLocked && (
          <div className="flex items-center gap-1 rounded-xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-300">
            <Lock className="h-3.5 w-3.5" />
            <span>Pizarra en pausa</span>
          </div>
        )}
      </div>

      {/* Leave button */}
      <div>
        <button
          type="button"
          onClick={onLeave}
          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
};
