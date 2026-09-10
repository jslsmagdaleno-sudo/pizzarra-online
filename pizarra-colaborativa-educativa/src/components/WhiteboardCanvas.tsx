import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  WhiteboardElement,
  ToolType,
  Participant,
  Point,
  ChallengeState,
  ChallengeSubmission,
} from '../types';
import { socketService } from '../services/socketService';

interface WhiteboardCanvasProps {
  roomId: string;
  elements: Record<string, WhiteboardElement>;
  pageId: string;
  currentParticipant: Participant;
  otherParticipants: Participant[];
  currentTool: ToolType;
  currentColor: string;
  strokeWidth: number;
  isLocked: boolean;
  showCursors: boolean;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onRecordHistory: (el: WhiteboardElement, action: 'create' | 'delete' | 'update', prev?: WhiteboardElement) => void;
  challenge?: ChallengeState;
  onSubmitChallenge?: (sub: ChallengeSubmission) => void;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  roomId,
  elements,
  pageId,
  currentParticipant,
  otherParticipants,
  currentTool,
  currentColor,
  strokeWidth,
  isLocked,
  showCursors,
  selectedElementId,
  onSelectElement,
  onRecordHistory,
  challenge,
  onSubmitChallenge,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [dragOffset, setDragOffset] = useState<Point | null>(null);
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  // Shape creation start point
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [shapeCurrent, setShapeCurrent] = useState<Point | null>(null);

  // Text inline editing
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInputPos, setTextInputPos] = useState<Point | null>(null);
  const [textInputValue, setTextInputValue] = useState('');

  const isTeacher = currentParticipant.role === 'teacher';
  const canEdit = !isLocked || isTeacher;

  // Filter elements by active page
  const pageElements: WhiteboardElement[] = (Object.values(elements || {}) as WhiteboardElement[]).filter(
    (el: WhiteboardElement) => el && el.pageId === pageId
  );

  // Helper to convert client pointer coords to canvas relative coords
  const getCanvasCoords = useCallback((e: React.PointerEvent): Point => {
    if (!containerRef.current) return { x: e.clientX, y: e.clientY };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    };
  }, []);

  // Broadcast throttled cursor movements to peers
  const lastCursorSentRef = useRef<number>(0);
  const handlePointerMoveThrottled = useCallback(
    (pt: Point) => {
      if (!showCursors) return;
      const now = Date.now();
      if (now - lastCursorSentRef.current > 40) {
        // ~25 updates per sec max
        lastCursorSentRef.current = now;
        socketService.moveCursor(roomId, currentParticipant.id, pt.x, pt.y);
      }
    },
    [roomId, currentParticipant.id, showCursors]
  );

  // Pointer Down handler
  const handlePointerDown = (e: React.PointerEvent) => {
    if (editingTextId) {
      commitText();
      return;
    }

    const pt = getCanvasCoords(e);
    handlePointerMoveThrottled(pt);

    // If eraser tool clicked on an element
    if (currentTool === 'eraser' && canEdit) {
      const clickedEl = getElementAtPosition(pt);
      if (clickedEl && (!clickedEl.isLocked || isTeacher)) {
        onRecordHistory(clickedEl, 'delete');
        socketService.deleteElement(roomId, clickedEl.id, currentParticipant.id);
      }
      return;
    }

    // If selecting/moving
    if (currentTool === 'select') {
      const targetEl = getElementAtPosition(pt);
      if (targetEl) {
        onSelectElement(targetEl.id);
        if (canEdit && (!targetEl.isLocked || isTeacher)) {
          setDraggingElementId(targetEl.id);
          setDragOffset({
            x: pt.x - targetEl.x,
            y: pt.y - targetEl.y,
          });
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
        }
      } else {
        onSelectElement(null);
      }
      return;
    }

    // If card / sticky tool or text tool clicked directly to create
    if (currentTool === 'text' && canEdit) {
      setTextInputPos(pt);
      setTextInputValue('');
      setEditingTextId('new');
      return;
    }

    if (currentTool === 'sticky' && canEdit) {
      const newEl: WhiteboardElement = {
        id: 'sticky_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        pageId,
        type: 'sticky',
        x: pt.x - 70,
        y: pt.y - 45,
        width: 140,
        height: 90,
        text: 'Escribe aquí...',
        color: currentColor,
        fillColor: currentColor === '#1e293b' ? '#fef08a' : '#fef9c3',
        strokeWidth: 2,
        fontSize: 16,
        fontWeight: 'normal',
        creatorId: currentParticipant.id,
        creatorName: currentParticipant.name,
        creatorRole: currentParticipant.role,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onRecordHistory(newEl, 'create');
      socketService.createElement(roomId, newEl);
      return;
    }

    if (currentTool === 'card' && canEdit) {
      const newEl: WhiteboardElement = {
        id: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        pageId,
        type: 'card',
        x: pt.x - 50,
        y: pt.y - 30,
        width: 100,
        height: 60,
        text: 'Ficha',
        color: currentColor,
        fillColor: '#eff6ff',
        strokeWidth: 2,
        fontSize: 18,
        fontWeight: 'bold',
        creatorId: currentParticipant.id,
        creatorName: currentParticipant.name,
        creatorRole: currentParticipant.role,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onRecordHistory(newEl, 'create');
      socketService.createElement(roomId, newEl);
      return;
    }

    // Drawing freehand strokes or shapes
    if (!canEdit) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    setIsDrawing(true);
    if (currentTool === 'pencil' || currentTool === 'marker') {
      setCurrentPoints([pt]);
    } else {
      setShapeStart(pt);
      setShapeCurrent(pt);
    }
  };

  // Pointer Move handler
  const handlePointerMove = (e: React.PointerEvent) => {
    const pt = getCanvasCoords(e);
    handlePointerMoveThrottled(pt);

    // If dragging an element
    if (draggingElementId && dragOffset && canEdit) {
      const targetEl = elements[draggingElementId];
      if (targetEl) {
        const newX = Math.round(pt.x - dragOffset.x);
        const newY = Math.round(pt.y - dragOffset.y);
        socketService.updateElement(roomId, draggingElementId, { x: newX, y: newY });
      }
      return;
    }

    // If drawing freehand stroke
    if (isDrawing && (currentTool === 'pencil' || currentTool === 'marker')) {
      setCurrentPoints((prev) => [...prev, pt]);
      return;
    }

    // If drawing shape
    if (isDrawing && shapeStart) {
      setShapeCurrent(pt);
      return;
    }

    // Check hovered element for author attribution
    const hovered = getElementAtPosition(pt);
    setHoveredElementId(hovered ? hovered.id : null);
  };

  // Pointer Up handler
  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (draggingElementId) {
      setDraggingElementId(null);
      setDragOffset(null);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    const pt = getCanvasCoords(e);

    // Finalize freehand stroke
    if (currentTool === 'pencil' || currentTool === 'marker') {
      if (currentPoints.length > 1) {
        const isMarker = currentTool === 'marker';
        const newEl: WhiteboardElement = {
          id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          pageId,
          type: 'stroke',
          x: 0,
          y: 0,
          points: currentPoints,
          color: currentColor,
          strokeWidth: isMarker ? Math.max(12, strokeWidth * 2) : strokeWidth,
          opacity: isMarker ? 0.35 : 1,
          creatorId: currentParticipant.id,
          creatorName: currentParticipant.name,
          creatorRole: currentParticipant.role,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        onRecordHistory(newEl, 'create');
        socketService.createElement(roomId, newEl);
      }
      setCurrentPoints([]);
    } else if (shapeStart && shapeCurrent) {
      // Finalize geometric shape
      const dx = shapeCurrent.x - shapeStart.x;
      const dy = shapeCurrent.y - shapeStart.y;
      const width = Math.abs(dx);
      const height = Math.abs(dy);

      if (width > 8 || height > 8) {
        const x = Math.min(shapeStart.x, shapeCurrent.x);
        const y = Math.min(shapeStart.y, shapeCurrent.y);

        let shapeType: WhiteboardElement['type'] = 'rect';
        if (currentTool === 'circle') shapeType = 'circle';
        else if (currentTool === 'line') shapeType = 'line';
        else if (currentTool === 'arrow') shapeType = 'arrow';
        else if (currentTool === 'star') shapeType = 'star';

        const newEl: WhiteboardElement = {
          id: 'shape_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          pageId,
          type: shapeType,
          x: shapeType === 'line' || shapeType === 'arrow' ? shapeStart.x : x,
          y: shapeType === 'line' || shapeType === 'arrow' ? shapeStart.y : y,
          width,
          height,
          points:
            shapeType === 'line' || shapeType === 'arrow'
              ? [shapeStart, shapeCurrent]
              : undefined,
          color: currentColor,
          fillColor: 'transparent',
          strokeWidth,
          creatorId: currentParticipant.id,
          creatorName: currentParticipant.name,
          creatorRole: currentParticipant.role,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        onRecordHistory(newEl, 'create');
        socketService.createElement(roomId, newEl);
      }
      setShapeStart(null);
      setShapeCurrent(null);
    }
  };

  // Helper to test if a point hits an element
  const getElementAtPosition = (pt: Point): WhiteboardElement | null => {
    // Check in reverse order so top-most elements get selected first
    for (let i = pageElements.length - 1; i >= 0; i--) {
      const el = pageElements[i];

      if (el.type === 'rect' || el.type === 'card' || el.type === 'sticky') {
        const w = el.width || 100;
        const h = el.height || 60;
        if (pt.x >= el.x && pt.x <= el.x + w && pt.y >= el.y && pt.y <= el.y + h) {
          return el;
        }
      } else if (el.type === 'circle') {
        const rx = (el.width || 80) / 2;
        const ry = (el.height || 80) / 2;
        const cx = el.x + rx;
        const cy = el.y + ry;
        const normalized = Math.pow(pt.x - cx, 2) / Math.pow(rx, 2) + Math.pow(pt.y - cy, 2) / Math.pow(ry, 2);
        if (normalized <= 1.2) return el;
      } else if (el.type === 'text') {
        const estWidth = (el.text?.length || 5) * (el.fontSize || 16) * 0.65;
        const estHeight = (el.fontSize || 16) * 1.4;
        if (pt.x >= el.x - 10 && pt.x <= el.x + estWidth + 10 && pt.y >= el.y - estHeight && pt.y <= el.y + 10) {
          return el;
        }
      } else if (el.type === 'stroke' && el.points) {
        // Point distance check
        for (const p of el.points) {
          const dist = Math.hypot(p.x - pt.x, p.y - pt.y);
          if (dist < Math.max(15, el.strokeWidth * 1.5)) return el;
        }
      } else if ((el.type === 'line' || el.type === 'arrow') && el.points && el.points.length >= 2) {
        const p1 = el.points[0];
        const p2 = el.points[1];
        const dist = distToSegment(pt, p1, p2);
        if (dist < 15) return el;
      }
    }
    return null;
  };

  function distToSegment(p: Point, v: Point, w: Point) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  // Text Commit
  const commitText = () => {
    if (!textInputPos || !textInputValue.trim()) {
      setEditingTextId(null);
      setTextInputPos(null);
      return;
    }

    if (editingTextId === 'new') {
      const newEl: WhiteboardElement = {
        id: 'text_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        pageId,
        type: 'text',
        x: textInputPos.x,
        y: textInputPos.y,
        text: textInputValue.trim(),
        color: currentColor,
        fontSize: 20,
        fontWeight: 'bold',
        strokeWidth: 1,
        creatorId: currentParticipant.id,
        creatorName: currentParticipant.name,
        creatorRole: currentParticipant.role,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onRecordHistory(newEl, 'create');
      socketService.createElement(roomId, newEl);
    } else if (editingTextId && elements[editingTextId]) {
      socketService.updateElement(roomId, editingTextId, { text: textInputValue.trim() });
    }

    setEditingTextId(null);
    setTextInputPos(null);
    setTextInputValue('');
  };

  // Convert points array to smooth SVG path string
  const getSvgPathFromPoints = (points: Point[]): string => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const midPoint = {
        x: (points[i - 1].x + points[i].x) / 2,
        y: (points[i - 1].y + points[i].y) / 2,
      };
      path += ` Q ${points[i - 1].x} ${points[i - 1].y}, ${midPoint.x} ${midPoint.y}`;
    }
    path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    return path;
  };

  // Star polygon points helper
  const getStarPoints = (cx: number, cy: number, rOuter: number, rInner: number): string => {
    let pts = '';
    const spikes = 5;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    for (let i = 0; i < spikes; i++) {
      const x1 = cx + Math.cos(rot) * rOuter;
      const y1 = cy + Math.sin(rot) * rOuter;
      pts += `${x1},${y1} `;
      rot += step;

      const x2 = cx + Math.cos(rot) * rInner;
      const y2 = cy + Math.sin(rot) * rInner;
      pts += `${x2},${y2} `;
      rot += step;
    }
    return pts;
  };

  // Check interactive challenge completion when student clicks "¡Terminé!"
  const handleStudentCompleteChallenge = () => {
    if (!challenge || !onSubmitChallenge) return;

    let score = 100;
    let errors = 0;

    // Check if order_numbers
    if (challenge.type === 'order_numbers' && challenge.correctOrder) {
      // Find cards on board sorted by X position
      const cards = pageElements
        .filter((el) => el.type === 'card' && el.value !== undefined)
        .sort((a, b) => a.x - b.x);

      const studentOrder = cards.map((c) => String(c.value));
      challenge.correctOrder.forEach((val, idx) => {
        if (studentOrder[idx] !== val) {
          errors++;
          score = Math.max(0, score - 20);
        }
      });
    }

    const elapsedSeconds = challenge.startedAt ? Math.round((Date.now() - challenge.startedAt) / 1000) : 45;

    const submission: ChallengeSubmission = {
      studentId: currentParticipant.id,
      studentName: currentParticipant.name,
      score,
      errors,
      timeSeconds: elapsedSeconds,
      completedAt: Date.now(),
      isCorrect: errors === 0,
    };

    onSubmitChallenge(submission);
  };

  const activeHoveredElement = hoveredElementId ? elements[hoveredElementId] : null;

  return (
    <div
      ref={containerRef}
      id="whiteboard-viewport"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative h-full w-full select-none overflow-hidden touch-none cursor-crosshair bg-slate-50"
      style={{
        backgroundImage: `radial-gradient(#cbd5e1 1.2px, transparent 1.2px)`,
        backgroundSize: '24px 24px',
      }}
    >
      {/* SVG Canvas for all rendered objects */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
          </marker>
        </defs>

        {/* Existing Elements */}
        {pageElements.map((el) => {
          const isSelected = selectedElementId === el.id;

          if (el.type === 'stroke' && el.points) {
            return (
              <path
                key={el.id}
                d={getSvgPathFromPoints(el.points)}
                stroke={el.color}
                strokeWidth={el.strokeWidth}
                strokeOpacity={el.opacity || 1}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            );
          }

          if (el.type === 'line' && el.points && el.points.length >= 2) {
            return (
              <line
                key={el.id}
                x1={el.points[0].x}
                y1={el.points[0].y}
                x2={el.points[1].x}
                y2={el.points[1].y}
                stroke={el.color}
                strokeWidth={el.strokeWidth}
                strokeLinecap="round"
              />
            );
          }

          if (el.type === 'arrow' && el.points && el.points.length >= 2) {
            return (
              <g key={el.id} color={el.color}>
                <line
                  x1={el.points[0].x}
                  y1={el.points[0].y}
                  x2={el.points[1].x}
                  y2={el.points[1].y}
                  stroke={el.color}
                  strokeWidth={el.strokeWidth}
                  strokeLinecap="round"
                  markerEnd="url(#arrowhead)"
                />
              </g>
            );
          }

          if (el.type === 'rect') {
            return (
              <rect
                key={el.id}
                x={el.x}
                y={el.y}
                width={el.width || 100}
                height={el.height || 60}
                rx={12}
                fill={el.fillColor || 'transparent'}
                stroke={el.color}
                strokeWidth={el.strokeWidth}
                className={isSelected ? 'filter drop-shadow-md' : ''}
              />
            );
          }

          if (el.type === 'circle') {
            const rx = (el.width || 80) / 2;
            const ry = (el.height || 80) / 2;
            return (
              <ellipse
                key={el.id}
                cx={el.x + rx}
                cy={el.y + ry}
                rx={rx}
                ry={ry}
                fill={el.fillColor || 'transparent'}
                stroke={el.color}
                strokeWidth={el.strokeWidth}
                className={isSelected ? 'filter drop-shadow-md' : ''}
              />
            );
          }

          if (el.type === 'star') {
            const size = Math.max(el.width || 60, el.height || 60);
            const cx = el.x + size / 2;
            const cy = el.y + size / 2;
            return (
              <polygon
                key={el.id}
                points={getStarPoints(cx, cy, size / 2, size / 4)}
                fill={el.fillColor || el.color}
                fillOpacity={0.2}
                stroke={el.color}
                strokeWidth={el.strokeWidth}
              />
            );
          }

          return null;
        })}

        {/* In-progress freehand stroke */}
        {isDrawing && currentPoints.length > 0 && (
          <path
            d={getSvgPathFromPoints(currentPoints)}
            stroke={currentColor}
            strokeWidth={currentTool === 'marker' ? Math.max(14, strokeWidth * 2) : strokeWidth}
            strokeOpacity={currentTool === 'marker' ? 0.35 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}

        {/* In-progress shape preview */}
        {isDrawing && shapeStart && shapeCurrent && (
          <>
            {currentTool === 'rect' && (
              <rect
                x={Math.min(shapeStart.x, shapeCurrent.x)}
                y={Math.min(shapeStart.y, shapeCurrent.y)}
                width={Math.abs(shapeCurrent.x - shapeStart.x)}
                height={Math.abs(shapeCurrent.y - shapeStart.y)}
                rx={8}
                fill="none"
                stroke={currentColor}
                strokeWidth={strokeWidth}
                strokeDasharray="4 4"
              />
            )}
            {currentTool === 'circle' && (
              <ellipse
                cx={(shapeStart.x + shapeCurrent.x) / 2}
                cy={(shapeStart.y + shapeCurrent.y) / 2}
                rx={Math.abs(shapeCurrent.x - shapeStart.x) / 2}
                ry={Math.abs(shapeCurrent.y - shapeStart.y) / 2}
                fill="none"
                stroke={currentColor}
                strokeWidth={strokeWidth}
                strokeDasharray="4 4"
              />
            )}
            {currentTool === 'line' && (
              <line
                x1={shapeStart.x}
                y1={shapeStart.y}
                x2={shapeCurrent.x}
                y2={shapeCurrent.y}
                stroke={currentColor}
                strokeWidth={strokeWidth}
                strokeDasharray="4 4"
              />
            )}
            {currentTool === 'arrow' && (
              <g color={currentColor}>
                <line
                  x1={shapeStart.x}
                  y1={shapeStart.y}
                  x2={shapeCurrent.x}
                  y2={shapeCurrent.y}
                  stroke={currentColor}
                  strokeWidth={strokeWidth}
                  markerEnd="url(#arrowhead)"
                />
              </g>
            )}
          </>
        )}
      </svg>

      {/* HTML DOM Layer for Rich Interactive Elements: Cards, Text, Stickies */}
      <div className="absolute inset-0 pointer-events-none">
        {pageElements.map((el) => {
          const isSelected = selectedElementId === el.id;

          // Text Element
          if (el.type === 'text') {
            return (
              <div
                key={el.id}
                onDoubleClick={() => {
                  if (canEdit && (!el.isLocked || isTeacher)) {
                    setEditingTextId(el.id);
                    setTextInputPos({ x: el.x, y: el.y });
                    setTextInputValue(el.text || '');
                  }
                }}
                className={`absolute pointer-events-auto cursor-pointer rounded px-1 transition-all ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                }`}
                style={{
                  left: el.x,
                  top: el.y,
                  color: el.color,
                  fontSize: `${el.fontSize || 18}px`,
                  fontWeight: el.fontWeight || 'bold',
                }}
              >
                {el.text}
              </div>
            );
          }

          // Educational Card / Drag Token
          if (el.type === 'card') {
            return (
              <div
                key={el.id}
                className={`absolute pointer-events-auto flex items-center justify-center rounded-xl border-2 font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 ${
                  isSelected ? 'ring-3 ring-blue-500 ring-offset-2' : ''
                }`}
                style={{
                  left: el.x,
                  top: el.y,
                  width: el.width || 100,
                  height: el.height || 60,
                  backgroundColor: el.fillColor || '#eff6ff',
                  borderColor: el.color || '#3b82f6',
                  color: el.color || '#1e3a8a',
                  fontSize: `${el.fontSize || 18}px`,
                  cursor: canEdit ? 'grab' : 'default',
                }}
              >
                <span>{el.text}</span>
              </div>
            );
          }

          // Sticky Note
          if (el.type === 'sticky') {
            return (
              <div
                key={el.id}
                onDoubleClick={() => {
                  if (canEdit && (!el.isLocked || isTeacher)) {
                    setEditingTextId(el.id);
                    setTextInputPos({ x: el.x + 8, y: el.y + 8 });
                    setTextInputValue(el.text || '');
                  }
                }}
                className={`absolute pointer-events-auto rounded-2xl border p-3 shadow-md transition-shadow cursor-text ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  left: el.x,
                  top: el.y,
                  width: el.width || 140,
                  height: el.height || 100,
                  backgroundColor: el.fillColor || '#fef9c3',
                  borderColor: el.color || '#eab308',
                  color: '#1e293b',
                  fontSize: `${el.fontSize || 15}px`,
                  cursor: canEdit ? 'grab' : 'default',
                }}
              >
                <p className="font-medium whitespace-pre-wrap">{el.text}</p>
              </div>
            );
          }

          return null;
        })}

        {/* Inline text input editor */}
        {editingTextId && textInputPos && (
          <div
            className="absolute pointer-events-auto z-40"
            style={{ left: textInputPos.x, top: textInputPos.y }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitText();
                if (e.key === 'Escape') {
                  setEditingTextId(null);
                  setTextInputPos(null);
                }
              }}
              onBlur={commitText}
              autoFocus
              placeholder="Escribe aquí..."
              className="rounded-lg border-2 border-blue-600 bg-white/95 px-3 py-1.5 text-lg font-bold text-slate-900 shadow-xl outline-none"
              style={{ color: currentColor }}
            />
          </div>
        )}

        {/* Discreet Creator Attribution Badge */}
        {activeHoveredElement && (
          <div
            className="pointer-events-none absolute z-40 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-lg backdrop-blur-sm"
            style={{
              left: Math.max(10, activeHoveredElement.x),
              top: Math.max(10, activeHoveredElement.y - 30),
            }}
          >
            Creado por: <span className="text-blue-600">{activeHoveredElement.creatorName}</span>
          </div>
        )}

        {/* Live Cursors for other participants */}
        {showCursors &&
          otherParticipants
            .filter((p) => p.isOnline && p.cursor)
            .map((p) => (
              <div
                key={p.id}
                className="pointer-events-none absolute z-50 transition-all duration-75 ease-out"
                style={{
                  left: p.cursor!.x,
                  top: p.cursor!.y,
                }}
              >
                <div className="flex items-center gap-1">
                  {/* Cursor pointer SVG */}
                  <svg
                    className="h-5 w-5 drop-shadow-md"
                    viewBox="0 0 24 24"
                    fill={p.color || '#3b82f6'}
                    stroke="white"
                    strokeWidth="1.5"
                  >
                    <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" />
                  </svg>
                  {/* Student Name Pill */}
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow-md whitespace-nowrap"
                    style={{ backgroundColor: p.color || '#3b82f6' }}
                  >
                    {p.name}
                  </span>
                </div>
              </div>
            ))}

        {/* Challenge Interactive Banner for Students */}
        {challenge && challenge.isActive && !isTeacher && (
          <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50/95 px-5 py-3 shadow-2xl backdrop-blur-md">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                ⭐ {challenge.title}
              </p>
              <p className="text-xs text-amber-950">{challenge.instructions}</p>
            </div>
            <button
              id="btn-finish-challenge"
              type="button"
              onClick={handleStudentCompleteChallenge}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-extrabold text-white shadow-md hover:bg-amber-600 transition-transform active:scale-95"
            >
              ¡Terminé! 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
