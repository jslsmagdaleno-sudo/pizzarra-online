import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  FolderHeart,
  PlusCircle,
  LogIn,
  Layers,
  Users,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react';
import { ActivityTemplate } from '../types';
import { DEFAULT_ACTIVITIES } from '../data/defaultActivities';
import { copyToClipboard, getRandomColor } from '../utils/helpers';

interface HomeViewProps {
  onSelectTeacher: () => void;
  onSelectStudent: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onSelectTeacher, onSelectStudent }) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 via-slate-50 to-indigo-50 p-4 sm:p-6">
      {/* Brand Header */}
      <div className="mb-8 text-center max-w-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-200">
          <GraduationCap className="h-9 w-9" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Pizarra Colaborativa Escolar
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base font-medium">
          Diseñada para clases en línea en Google Meet con alumnos de primaria.
          <br />
          <span className="text-blue-700 font-bold">¡Sin cuentas, sin contraseñas y en tiempo real!</span>
        </p>
      </div>

      {/* Pantalla 1: Dos opciones grandes */}
      <div className="grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Opción Profesor */}
        <button
          id="btn-role-teacher"
          type="button"
          onClick={onSelectTeacher}
          className="group relative flex flex-col items-center justify-between rounded-3xl border-2 border-slate-200 bg-white p-8 text-center shadow-lg transition-all hover:-translate-y-1 hover:border-blue-500 hover:shadow-2xl active:scale-98"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 text-4xl group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
            👨‍🏫
          </div>
          <div className="my-6">
            <h2 className="text-2xl font-black text-slate-900">Soy Profesor</h2>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Crea salas, comparte enlace por Meet, controla la pizarra, bloquea edición y activa retos.
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            Crear o administrar clase <ArrowRight className="h-4 w-4" />
          </span>
        </button>

        {/* Opción Alumno */}
        <button
          id="btn-role-student"
          type="button"
          onClick={onSelectStudent}
          className="group relative flex flex-col items-center justify-between rounded-3xl border-2 border-slate-200 bg-white p-8 text-center shadow-lg transition-all hover:-translate-y-1 hover:border-emerald-500 hover:shadow-2xl active:scale-98"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 text-4xl group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-sm">
            👨‍🎓
          </div>
          <div className="my-6">
            <h2 className="text-2xl font-black text-slate-900">Soy Alumno</h2>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Entra en 10 segundos con tu nombre y el código que te dio tu profesor. ¡Sin registrarte!
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            Entrar a la pizarra <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      </div>

      {/* Feature trust badges */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-blue-600" /> Acceso seguro sin datos personales
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-500" /> Sincronización colaborativa en vivo
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-emerald-600" /> Compatible con PC, tablet y celular
        </span>
      </div>
    </div>
  );
};

// Pantalla 2: Panel Profesor
interface TeacherDashboardProps {
  onBack: () => void;
  onGoToCreate: () => void;
  onOpenTemplates: () => void;
  onJoinAsTeacher: (code: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onBack,
  onGoToCreate,
  onOpenTemplates,
  onJoinAsTeacher,
}) => {
  const [existingCode, setExistingCode] = useState('');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-slate-50 p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          <ChevronLeft className="h-4 w-4" /> Volver al inicio
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            👨‍🏫
          </div>
          <h2 className="text-2xl font-black text-slate-900">Panel del Profesor</h2>
          <p className="text-xs text-slate-500">Elige qué deseas hacer en tu clase de hoy</p>
        </div>

        <div className="space-y-3">
          {/* Botón 1: Crear nueva sala */}
          <button
            id="btn-teacher-create-new"
            type="button"
            onClick={onGoToCreate}
            className="flex w-full items-center justify-between rounded-2xl bg-blue-600 p-4 font-bold text-white shadow-md hover:bg-blue-700 transition-all"
          >
            <div className="flex items-center gap-3 text-left">
              <PlusCircle className="h-6 w-6" />
              <div>
                <p className="text-sm font-extrabold">Crear nueva sala</p>
                <p className="text-xs text-blue-200">Genera un código e inicia la clase</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5" />
          </button>

          {/* Botón 2: Mis actividades */}
          <button
            id="btn-teacher-templates"
            type="button"
            onClick={onOpenTemplates}
            className="flex w-full items-center justify-between rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 font-bold text-purple-900 hover:bg-purple-100 transition-all"
          >
            <div className="flex items-center gap-3 text-left">
              <FolderHeart className="h-6 w-6 text-purple-600" />
              <div>
                <p className="text-sm font-extrabold">Mis actividades</p>
                <p className="text-xs text-purple-600">Plantillas guardadas y reutilizables</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-purple-600" />
          </button>

          {/* Botón 3: Entrar a una sala */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Entrar a una sala existente
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={5}
                value={existingCode}
                onChange={(e) => setExistingCode(e.target.value.toUpperCase())}
                placeholder="Código ej. 7K4P2"
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center font-mono text-sm font-black uppercase text-slate-800 tracking-wider outline-none focus:border-blue-500"
              />
              <button
                type="button"
                disabled={existingCode.trim().length < 3}
                onClick={() => onJoinAsTeacher(existingCode.trim())}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-40"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pantalla 3: Crear sala
interface CreateRoomViewProps {
  onBack: () => void;
  onCreateRoom: (name: string, templateId?: string) => Promise<{ roomId: string; teacherKey: string } | null>;
  onEnterRoom: (roomId: string, teacherKey: string) => void;
}

export const CreateRoomView: React.FC<CreateRoomViewProps> = ({
  onBack,
  onCreateRoom,
  onEnterRoom,
}) => {
  const [activityName, setActivityName] = useState('Clase de Primaria');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoomData, setCreatedRoomData] = useState<{ roomId: string; teacherKey: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityName.trim()) return;
    setIsCreating(true);
    const res = await onCreateRoom(activityName.trim(), selectedTemplateId || undefined);
    setIsCreating(false);
    if (res) {
      setCreatedRoomData(res);
    }
  };

  const handleCopyCode = async () => {
    if (!createdRoomData) return;
    await copyToClipboard(createdRoomData.roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = async () => {
    if (!createdRoomData) return;
    const url = `${window.location.origin}/?room=${createdRoomData.roomId}`;
    await copyToClipboard(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-slate-50 p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          <ChevronLeft className="h-4 w-4" /> Volver
        </button>

        {!createdRoomData ? (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-slate-900">Crear Sala de Clase</h2>
              <p className="text-xs text-slate-500">Configura la actividad antes de invitar a los alumnos</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre de la actividad
                </label>
                <input
                  type="text"
                  required
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  placeholder="Ej. Matemáticas: Ordenar decimales"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Tipo de actividad (opcional)
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="">Pizarra en blanco (vacía)</option>
                  <optgroup label="Matemáticas">
                    <option value="math-order-decimals">Ordenar decimales (con reto)</option>
                    <option value="math-compare-signs">Comparar números (&gt; &lt; =)</option>
                    <option value="math-number-line">Recta numérica interactiva</option>
                  </optgroup>
                  <optgroup label="Español">
                    <option value="spanish-classify-words">Clasificar: Sustantivos, Verbos y Adjetivos</option>
                    <option value="spanish-order-sentence">Ordenar oraciones</option>
                  </optgroup>
                  <optgroup label="Ciencias">
                    <option value="science-matter-states">Estados de la materia</option>
                    <option value="science-water-cycle">El ciclo del agua</option>
                  </optgroup>
                </select>
              </div>

              <button
                id="btn-submit-create-room"
                type="submit"
                disabled={isCreating}
                className="w-full mt-4 rounded-xl bg-blue-600 py-3 text-sm font-extrabold text-white shadow-md hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {isCreating ? 'Generando sala...' : 'Generar sala y código'}
              </button>
            </form>
          </div>
        ) : (
          /* Sala Generada (Pantalla 3 - Código: 7K4P2 + Copiar enlace) */
          <div className="text-center space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-8 w-8" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">¡Sala lista!</span>
              <h2 className="text-xl font-black text-slate-900">{activityName}</h2>
            </div>

            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">
                Código de sala para tus alumnos:
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-4xl font-black tracking-widest text-blue-900">
                  {createdRoomData.roomId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="rounded-xl border border-blue-300 bg-white p-2 text-blue-700 shadow-xs hover:bg-blue-50"
                  title="Copiar código"
                >
                  {copiedCode ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <button
                id="btn-copy-meet-link"
                type="button"
                onClick={handleCopyLink}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 bg-emerald-50 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100 transition-all"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-5 w-5 text-emerald-600" />
                    <span>¡Enlace copiado al portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5 text-emerald-600" />
                    <span>Copiar enlace de acceso directo</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-500">
                Pega este enlace en el chat de Google Meet para que tus alumnos entren con un solo clic.
              </p>
            </div>

            <button
              id="btn-enter-created-board"
              type="button"
              onClick={() => onEnterRoom(createdRoomData.roomId, createdRoomData.teacherKey)}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-black text-white shadow-lg hover:bg-blue-700 transition-all active:scale-98"
            >
              Entrar a la pizarra ahora 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Pantalla 4: Alumno (Tu nombre + Código de sala + Entrar a la pizarra)
interface StudentJoinViewProps {
  initialRoomId?: string;
  onBack: () => void;
  onJoin: (studentName: string, roomId: string) => void;
}

export const StudentJoinView: React.FC<StudentJoinViewProps> = ({
  initialRoomId = '',
  onBack,
  onJoin,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialRoomId.toUpperCase());
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanName) {
      setErrorMsg('Por favor escribe tu nombre');
      return;
    }
    if (!cleanCode) {
      setErrorMsg('Por favor introduce el código de sala');
      return;
    }

    onJoin(cleanName, cleanCode);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50 via-teal-50 to-blue-50 p-4">
      <div className="w-full max-w-md rounded-3xl border-2 border-emerald-200 bg-white p-8 shadow-2xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          <ChevronLeft className="h-4 w-4" /> Volver
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-3xl shadow-sm">
            👨‍🎓
          </div>
          <h2 className="text-2xl font-black text-slate-900">¡Hola, bienvenido!</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Escribe tu nombre para entrar a la clase con tu profesor.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl bg-rose-50 p-3 text-center text-xs font-bold text-rose-700 border border-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Pantalla 4: Formulario súper sencillo */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1">
              Tu nombre:
            </label>
            <input
              type="text"
              id="student-name-input"
              autoFocus
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMsg('');
              }}
              placeholder="Ej. José, Ana, Carlos..."
              className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-base font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1">
              Código de sala:
            </label>
            <input
              type="text"
              id="student-code-input"
              required
              maxLength={5}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setErrorMsg('');
              }}
              placeholder="7K4P2"
              className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-center font-mono text-xl font-black uppercase tracking-widest text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <button
            id="btn-student-enter-board"
            type="submit"
            className="w-full mt-6 rounded-2xl bg-emerald-500 py-4 text-base font-black text-white shadow-xl hover:bg-emerald-600 transition-all active:scale-98"
          >
            Entrar a la pizarra 🎨
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[11px] font-bold text-slate-400">
            🔒 No necesitas correo ni contraseña.
          </p>
        </div>
      </div>
    </div>
  );
};
