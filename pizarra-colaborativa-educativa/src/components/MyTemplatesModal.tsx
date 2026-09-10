import React, { useState, useEffect } from 'react';
import { X, FolderHeart, Plus, Trash2, Copy, Play, Check } from 'lucide-react';
import { ActivityTemplate, WhiteboardElement } from '../types';

interface MyTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentElements: Record<string, WhiteboardElement>;
  activePageId: string;
  activityName: string;
  onLoadTemplate: (template: ActivityTemplate) => void;
}

export const MyTemplatesModal: React.FC<MyTemplatesModalProps> = ({
  isOpen,
  onClose,
  currentElements,
  activePageId,
  activityName,
  onLoadTemplate,
}) => {
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successSaved, setSuccessSaved] = useState(false);

  // Load custom templates
  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error('Failed to load templates', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setNewTemplateTitle(activityName || 'Mi plantilla guardada');
    }
  }, [isOpen, activityName]);

  if (!isOpen) return null;

  const handleSaveCurrentAsTemplate = async () => {
    if (!newTemplateTitle.trim()) return;
    setIsSaving(true);

    const pageElements = (Object.values(currentElements || {}) as WhiteboardElement[]).filter(
      (el: WhiteboardElement) => el && el.pageId === activePageId
    );

    // Strip dynamic runtime properties
    const elementsToSave = pageElements.map(({ id, pageId, createdAt, updatedAt, ...rest }) => rest);

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTemplateTitle.trim(),
          subject: 'matematicas',
          grade: 'Primaria',
          description: `Guardada desde la clase "${activityName}" con ${elementsToSave.length} elementos.`,
          elements: elementsToSave,
        }),
      });

      if (res.ok) {
        setSuccessSaved(true);
        setTimeout(() => setSuccessSaved(false), 2500);
        fetchTemplates();
      }
    } catch (err) {
      console.error('Failed to save template', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete template', err);
    }
  };

  const customOnly = templates.filter((t) => t.isCustom);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative flex h-[80vh] max-h-[650px] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <FolderHeart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Mis Actividades y Plantillas Reutilizables</h2>
              <p className="text-xs text-slate-500">Guarda tus pizarras para usarlas en otras clases o duplicarlas.</p>
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

        {/* Save current board bar */}
        <div className="border-b border-slate-200 bg-purple-50/50 p-4">
          <label className="text-xs font-bold uppercase tracking-wider text-purple-900 block mb-1.5">
            💾 Guardar pizarra actual como plantilla
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTemplateTitle}
              onChange={(e) => setNewTemplateTitle(e.target.value)}
              placeholder="Ej. Fracciones - Actividad 1..."
              className="flex-1 rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveCurrentAsTemplate}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-purple-700 transition-all disabled:opacity-50"
            >
              {successSaved ? (
                <>
                  <Check className="h-4 w-4 text-emerald-300" />
                  <span>¡Guardado!</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Guardar plantilla</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Templates list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Plantillas personalizadas guardadas ({customOnly.length})
          </h3>

          {customOnly.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400">
              <FolderHeart className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">Aún no has guardado plantillas personalizadas</p>
              <p className="text-xs text-slate-400 mt-1">
                Escribe un nombre arriba y haz clic en "Guardar plantilla" para archivar tu diseño actual.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {customOnly.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md transition-shadow"
                >
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{tmpl.title}</h4>
                    <p className="mt-1 text-xs text-slate-500">{tmpl.description}</p>
                    <span className="mt-2 inline-block rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                      {tmpl.elements.length} elementos
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Eliminar plantilla"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLoadTemplate(tmpl);
                        onClose();
                      }}
                      className="flex items-center gap-1 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition-all"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Cargar en pizarra
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
