import React, { useEffect } from 'react';
import { X, Trophy, Medal, RotateCcw, Clock, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChallengeState, ChallengeSubmission } from '../types';
import { formatTime } from '../utils/helpers';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge?: ChallengeState;
  isTeacher: boolean;
  onRestartChallenge?: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  isOpen,
  onClose,
  challenge,
  isTeacher,
  onRestartChallenge,
}) => {
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {}
    }
  }, [isOpen]);

  if (!isOpen || !challenge) return null;

  const submissionsList: ChallengeSubmission[] = (
    Object.values(challenge.submissions || {}) as ChallengeSubmission[]
  )
    .filter((s): s is ChallengeSubmission => Boolean(s))
    .sort((a, b) => {
    // Sort by score descending, then time ascending, then errors ascending
    if (b.score !== a.score) return b.score - a.score;
    if (a.errors !== b.errors) return a.errors - b.errors;
    return a.timeSeconds - b.timeSeconds;
  });

  const top3 = submissionsList.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative flex h-[85vh] max-h-[650px] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-amber-500 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black">{challenge.title || 'Resultados del Reto'}</h2>
              <p className="text-xs text-amber-100">Tabla de posiciones y respuestas de los alumnos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/80 hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Podium for Top 3 */}
        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-4 bg-gradient-to-b from-amber-50 to-white px-6 pt-6 pb-2">
            {/* 2nd Place */}
            {top3[1] && (
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold border-2 border-slate-300 shadow-sm text-sm">
                  🥈 2°
                </div>
                <span className="mt-1 text-xs font-bold text-slate-800">{top3[1].studentName}</span>
                <span className="text-[11px] text-slate-500">{top3[1].score} pts • {top3[1].timeSeconds}s</span>
                <div className="mt-2 h-16 w-20 rounded-t-xl bg-slate-200 shadow-inner flex items-center justify-center font-black text-slate-500">
                  2°
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <div className="flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-amber-950 font-black border-2 border-amber-500 shadow-md text-base">
                  🥇 1°
                </div>
                <span className="mt-1 text-sm font-black text-slate-900">{top3[0].studentName}</span>
                <span className="text-xs font-bold text-amber-600">{top3[0].score} pts • {top3[0].timeSeconds}s</span>
                <div className="mt-2 h-24 w-24 rounded-t-xl bg-amber-300 shadow-inner flex items-center justify-center font-black text-amber-800 text-lg">
                  1°
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-700/20 text-amber-900 font-bold border-2 border-amber-600 shadow-sm text-sm">
                  🥉 3°
                </div>
                <span className="mt-1 text-xs font-bold text-slate-800">{top3[2].studentName}</span>
                <span className="text-[11px] text-slate-500">{top3[2].score} pts • {top3[2].timeSeconds}s</span>
                <div className="mt-2 h-12 w-20 rounded-t-xl bg-amber-200 shadow-inner flex items-center justify-center font-black text-amber-900">
                  3°
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Table (Requisito: Pantalla 6 - Resultados | Posición | Alumno | Puntos | Tiempo | Errores |) */}
        <div className="flex-1 overflow-y-auto p-6">
          {submissionsList.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400">
              <Clock className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">Esperando respuestas de los alumnos...</p>
              <p className="text-xs text-slate-400 mt-1">
                Cuando los alumnos terminen y hagan clic en "¡Terminé!", aparecerán en esta tabla en tiempo real.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-center">Posición</th>
                    <th className="px-4 py-3">Alumno</th>
                    <th className="px-4 py-3 text-center">Puntos</th>
                    <th className="px-4 py-3 text-center">Tiempo</th>
                    <th className="px-4 py-3 text-center">Errores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissionsList.map((sub, idx) => (
                    <tr key={sub.studentId} className={idx === 0 ? 'bg-amber-50/40 font-bold' : ''}>
                      <td className="px-4 py-3 text-center font-black text-slate-700">
                        {idx === 0 ? '🥇 1°' : idx === 1 ? '🥈 2°' : idx === 2 ? '🥉 3°' : `${idx + 1}°`}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{sub.studentName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                          {sub.score} pts
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 font-mono">
                        {formatTime(sub.timeSeconds)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            sub.errors === 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {sub.errors}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <p className="text-xs text-slate-500">
            {submissionsList.length} alumno(s) han completado el reto.
          </p>

          <div className="flex items-center gap-2">
            {isTeacher && onRestartChallenge && (
              <button
                type="button"
                onClick={onRestartChallenge}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <RotateCcw className="h-4 w-4" />
                Reiniciar reto
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
