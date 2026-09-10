import React, { useState } from 'react';
import { X, BookOpen, Calculator, Sparkles, Check, Play } from 'lucide-react';
import { ActivityTemplate } from '../types';
import { DEFAULT_ACTIVITIES } from '../data/defaultActivities';

interface ActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadActivity: (activity: ActivityTemplate, startAsChallenge: boolean) => void;
}

export const ActivitiesModal: React.FC<ActivitiesModalProps> = ({
  isOpen,
  onClose,
  onLoadActivity,
}) => {
  const [activeTab, setActiveTab] = useState<'matematicas' | 'espanol' | 'ciencias'>('matematicas');
  const [selectedActivityId, setSelectedActivityId] = useState<string>(DEFAULT_ACTIVITIES[0]?.id || '');
  const [startAsChallenge, setStartAsChallenge] = useState(true);

  if (!isOpen) return null;

  const filteredActivities = DEFAULT_ACTIVITIES.filter((a) => a.subject === activeTab);
  const currentActivity = DEFAULT_ACTIVITIES.find((a) => a.id === selectedActivityId) || filteredActivities[0];

  const handleApply = () => {
    if (currentActivity) {
      onLoadActivity(currentActivity, startAsChallenge);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative flex h-[85vh] max-h-[700px] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Actividades Educativas Prediseñadas</h2>
              <p className="text-xs text-slate-500">Selecciona una actividad para cargarla sobre la pizarra de tus alumnos.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Subject Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('matematicas');
              const first = DEFAULT_ACTIVITIES.find((a) => a.subject === 'matematicas');
              if (first) setSelectedActivityId(first.id);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'matematicas'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="h-4 w-4" />
            Matemáticas
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('espanol');
              const first = DEFAULT_ACTIVITIES.find((a) => a.subject === 'espanol');
              if (first) setSelectedActivityId(first.id);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'espanol'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Español / Lengua
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('ciencias');
              const first = DEFAULT_ACTIVITIES.find((a) => a.subject === 'ciencias');
              if (first) setSelectedActivityId(first.id);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'ciencias'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Ciencias
          </button>
        </div>

        {/* Body: 2 Columns (Activities list + Detail preview) */}
        <div className="flex flex-1 overflow-hidden">
          {/* List */}
          <div className="w-1/2 border-r border-slate-200 overflow-y-auto p-4 space-y-2">
            {filteredActivities.map((act) => {
              const isSelected = act.id === currentActivity?.id;
              return (
                <div
                  key={act.id}
                  onClick={() => setSelectedActivityId(act.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/70 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                      {act.grade}
                    </span>
                    {act.challenge && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        ⚡ Reto con ranking
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1.5 font-bold text-slate-900 text-sm">{act.title}</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{act.description}</p>
                </div>
              );
            })}
          </div>

          {/* Preview & Confirmation */}
          <div className="flex w-1/2 flex-col justify-between p-6 bg-slate-50/50">
            {currentActivity ? (
              <div className="space-y-4">
                <div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    {currentActivity.grade}
                  </span>
                  <h3 className="mt-2 text-xl font-extrabold text-slate-900">{currentActivity.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{currentActivity.description}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Contenido incluido
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-700">
                    <li>• {currentActivity.elements.length} elementos gráficos y fichas interactivas</li>
                    <li>• Compatible con arrastrar y soltar en mouse, touchpad y tablets</li>
                    {currentActivity.challenge && (
                      <li className="text-amber-700 font-semibold">• Sistema de verificación de respuestas y podio</li>
                    )}
                  </ul>
                </div>

                {currentActivity.challenge && (
                  <label className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={startAsChallenge}
                      onChange={(e) => setStartAsChallenge(e.target.checked)}
                      className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-amber-900">Activar reto con temporizador y podio</p>
                      <p className="text-[11px] text-amber-700">Los alumnos verán un botón para enviar y competir por tiempo.</p>
                    </div>
                  </label>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                Selecciona una actividad
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-load-activity"
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition-all active:scale-95"
              >
                <Play className="h-4 w-4" />
                Cargar en la pizarra
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
