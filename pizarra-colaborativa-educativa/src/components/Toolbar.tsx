import React from 'react';
import {
  Pencil,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Type,
  Minus,
  ArrowRight,
  Circle,
  Square,
  Star,
  MousePointer,
  Trash2,
  StickyNote,
  Palette,
  Lock,
} from 'lucide-react';
import { ToolType } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  setTool: (tool: ToolType) => void;
  currentColor: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  selectedElementId: string | null;
  onDeleteSelected: () => void;
  isLocked: boolean;
  isTeacher: boolean;
}

const COLOR_PALETTE = [
  { name: 'Azul', value: '#2563eb' },
  { name: 'Rojo', value: '#dc2626' },
  { name: 'Verde', value: '#16a34a' },
  { name: 'Ámbar', value: '#d97706' },
  { name: 'Púrpura', value: '#7c3aed' },
  { name: 'Rosa', value: '#db2777' },
  { name: 'Negro', value: '#1e293b' },
  { name: 'Cian', value: '#0891b2' },
];

const STROKE_WIDTHS = [
  { label: 'Fino', value: 2 },
  { label: 'Medio', value: 4 },
  { label: 'Grueso', value: 8 },
  { label: 'Extra', value: 16 },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  setTool,
  currentColor,
  setColor,
  strokeWidth,
  setStrokeWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  selectedElementId,
  onDeleteSelected,
  isLocked,
  isTeacher,
}) => {
  const disabled = isLocked && !isTeacher;

  return (
    <aside
      aria-label="Barra de herramientas"
      className="absolute left-4 top-20 z-20 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur-md transition-all sm:top-24 md:left-6"
    >
      {disabled && (
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-800 border border-amber-200 mb-1">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Edición bloqueada</span>
        </div>
      )}

      {/* Primary Tools Grid */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-1">
        <button
          id="tool-select"
          type="button"
          onClick={() => setTool('select')}
          title="Seleccionar y mover objetos (V)"
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
            currentTool === 'select'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <MousePointer className="h-5 w-5" />
        </button>

        <button
          id="tool-pencil"
          type="button"
          disabled={disabled}
          onClick={() => setTool('pencil')}
          title="Lápiz (P)"
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
            currentTool === 'pencil'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-slate-700 hover:bg-slate-100 disabled:opacity-40'
          }`}
        >
          <Pencil className="h-5 w-5" />
        </button>

        <button
          id="tool-marker"
          type="button"
          disabled={disabled}
          onClick={() => setTool('marker')}
          title="Marcador / Resaltador (M)"
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
            currentTool === 'marker'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-slate-700 hover:bg-slate-100 disabled:opacity-40'
          }`}
        >
          <Highlighter className="h-5 w-5" />
        </button>

        <button
          id="tool-text"
          type="button"
          disabled={disabled}
          onClick={() => setTool('text')}
          title="Escribir texto (T)"
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
            currentTool === 'text'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-slate-700 hover:bg-slate-100 disabled:opacity-40'
          }`}
        >
          <Type className="h-5 w-5" />
        </button>

        <button
          id="tool-eraser"
          type="button"
          disabled={disabled}
          onClick={() => setTool('eraser')}
          title="Borrador (E)"
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
            currentTool === 'eraser'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
              : 'text-slate-700 hover:bg-slate-100 disabled:opacity-40'
          }`}
        >
          <Eraser className="h-5 w-5" />
        </button>

        <button
          id="tool-sticky"
          type="button"
          disabled={disabled}
          onClick={() => setTool('sticky')}
          title="Nota adhesiva / Ficha educativa"
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
            currentTool === 'sticky'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
              : 'text-slate-700 hover:bg-slate-100 disabled:opacity-40'
          }`}
        >
          <StickyNote className="h-5 w-5" />
        </button>
      </div>

      <div className="my-1 border-t border-slate-200" />

      {/* Shapes */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-1">
        <button
          id="tool-line"
          type="button"
          disabled={disabled}
          onClick={() => setTool('line')}
          title="Línea recta"
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
            currentTool === 'line' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 disabled:opacity-40'
          }`}
        >
          <Minus className="h-4 w-4" />
        </button>

        <button
          id="tool-arrow"
          type="button"
          disabled={disabled}
          onClick={() => setTool('arrow')}
          title="Flecha"
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
            currentTool === 'arrow' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 disabled:opacity-40'
          }`}
        >
          <ArrowRight className="h-4 w-4" />
        </button>

        <button
          id="tool-rect"
          type="button"
          disabled={disabled}
          onClick={() => setTool('rect')}
          title="Rectángulo"
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
            currentTool === 'rect' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 disabled:opacity-40'
          }`}
        >
          <Square className="h-4 w-4" />
        </button>

        <button
          id="tool-circle"
          type="button"
          disabled={disabled}
          onClick={() => setTool('circle')}
          title="Círculo"
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
            currentTool === 'circle' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 disabled:opacity-40'
          }`}
        >
          <Circle className="h-4 w-4" />
        </button>

        <button
          id="tool-star"
          type="button"
          disabled={disabled}
          onClick={() => setTool('star')}
          title="Estrella"
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
            currentTool === 'star' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 disabled:opacity-40'
          }`}
        >
          <Star className="h-4 w-4" />
        </button>
      </div>

      <div className="my-1 border-t border-slate-200" />

      {/* Color Palette Popover / Inline */}
      <div className="flex flex-col items-center gap-1">
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-2">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.value}
              id={`color-${c.name.toLowerCase()}`}
              type="button"
              disabled={disabled}
              onClick={() => setColor(c.value)}
              title={c.name}
              className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                currentColor === c.value ? 'scale-110 border-slate-800 ring-2 ring-blue-400' : 'border-white'
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>

      <div className="my-1 border-t border-slate-200" />

      {/* Stroke Width Selector */}
      <div className="flex items-center justify-center gap-1">
        {STROKE_WIDTHS.map((sw) => (
          <button
            key={sw.value}
            id={`stroke-${sw.label.toLowerCase()}`}
            type="button"
            disabled={disabled}
            onClick={() => setStrokeWidth(sw.value)}
            title={`Grosor: ${sw.label}`}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold transition-all ${
              strokeWidth === sw.value
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100 disabled:opacity-40'
            }`}
          >
            <span
              className="rounded-full bg-current"
              style={{ width: Math.max(3, sw.value * 0.9), height: Math.max(3, sw.value * 0.9) }}
            />
          </button>
        ))}
      </div>

      <div className="my-1 border-t border-slate-200" />

      {/* Undo / Redo & Delete */}
      <div className="flex items-center justify-center gap-1">
        <button
          id="btn-undo"
          type="button"
          disabled={!canUndo || disabled}
          onClick={onUndo}
          title="Deshacer (Ctrl+Z)"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30"
        >
          <Undo2 className="h-4 w-4" />
        </button>

        <button
          id="btn-redo"
          type="button"
          disabled={!canRedo || disabled}
          onClick={onRedo}
          title="Rehacer (Ctrl+Y)"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30"
        >
          <Redo2 className="h-4 w-4" />
        </button>

        {selectedElementId && (
          <button
            id="btn-delete-element"
            type="button"
            disabled={disabled}
            onClick={onDeleteSelected}
            title="Eliminar elemento seleccionado (Supr)"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
