import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, X, Sun, CalendarDays, ListTodo } from 'lucide-react';
import { CATEGORIAS, diaSemana, fechaLocal, useAgenda, type Bloque, type Categoria, type DatosBloque, type Prioridad, type Tarea } from '../hooks/useAgenda';
import type { Nota } from '../lib/tipos';
import { textoPlano } from '../lib/sanitizar';
import { buscarEtiqueta } from '../lib/etiquetas';
import { TarjetaNota } from './TarjetaNota';
import { Dialogo } from './Dialogo';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const COLOR_CATEGORIA: Record<Categoria, string> = {
  Gym: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  Contenido: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200',
  Trabajo: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
  Personal: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
};
const PRIORIDADES: { id: Prioridad; nombre: string; clase: string }[] = [
  { id: 'alta', nombre: 'Alta', clase: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200' },
  { id: 'media', nombre: 'Media', clase: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200' },
  { id: 'baja', nombre: 'Baja', clase: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200' },
];
const ORDEN_PRIORIDAD: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };
const ETIQUETAS_NOTA = ['importante', 'muy-importante', 'urgente'];

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const fechaBonita = (f: string) => {
  const [a, m, d] = f.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
};

function Seccion({ icono, titulo, accion, children }: { icono: ReactNode; titulo: string; accion?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-violet-600 dark:text-violet-400">{icono}</span>
        <h2 className="flex-1 text-lg font-bold">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

function ChipPrioridad({ p }: { p: Prioridad }) {
  const x = PRIORIDADES.find((y) => y.id === p)!;
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${x.clase}`}>{x.nombre}</span>;
}

function FilaBloque({ b, fecha, onAlternar, onEditar, onEliminar }: { b: Bloque; fecha: string; onAlternar: () => void; onEditar?: () => void; onEliminar?: () => void }) {
  const hecho = b.hechos.includes(fecha);
  return (
    <li className="flex items-center gap-2 py-1.5">
      <input type="checkbox" className="h-5 w-5 shrink-0 accent-violet-600" checked={hecho} onChange={onAlternar} aria-label={`Marcar ${b.actividad}`} />
      <span className="w-12 shrink-0 text-sm tabular-nums text-stone-500">{b.hora}</span>
      <span className={`min-w-0 flex-1 truncate ${hecho ? 'text-stone-400 line-through' : ''}`}>{b.actividad}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_CATEGORIA[b.categoria] ?? ''}`}>{b.categoria}</span>
      {onEditar && (
        <button className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800" onClick={onEditar} aria-label="Editar bloque"><Pencil size={14} /></button>
      )}
      {onEliminar && (
        <button className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20" onClick={onEliminar} aria-label="Eliminar bloque"><Trash2 size={14} /></button>
      )}
    </li>
  );
}

function FilaTarea({ t, hoy, onAlternar, onBorrar }: { t: Tarea; hoy?: string; onAlternar: () => void; onBorrar: () => void }) {
  const vencida = hoy && t.fecha && t.fecha < hoy && !t.hecha;
  return (
    <li className="group flex items-center gap-2 py-1.5">
      <input type="checkbox" className="h-5 w-5 shrink-0 accent-violet-600" checked={t.hecha} onChange={onAlternar} aria-label={`Completar ${t.titulo}`} />
      <span className={`min-w-0 flex-1 truncate ${t.hecha ? 'text-stone-400 line-through' : ''}`}>{t.titulo}</span>
      {vencida && <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white">Vencida</span>}
      <ChipPrioridad p={t.prioridad} />
      <button className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20" onClick={onBorrar} aria-label="Borrar tarea"><X size={14} /></button>
    </li>
  );
}

function FormTarea({ onCrear, boton = 'Agregar' }: { onCrear: (titulo: string, p: Prioridad) => void; boton?: string }) {
  const [titulo, setTitulo] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('media');
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!titulo.trim()) return;
        onCrear(titulo, prioridad);
        setTitulo('');
      }}
    >
      <input className="campo min-w-0 flex-1 py-1.5" placeholder="Nueva tarea…" value={titulo} maxLength={200} onChange={(e) => setTitulo(e.target.value)} />
      <select className="campo w-auto py-1.5" value={prioridad} onChange={(e) => setPrioridad(e.target.value as Prioridad)} aria-label="Prioridad">
        {PRIORIDADES.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
      <button className="boton px-3" aria-label={boton}><Plus size={18} /></button>
    </form>
  );
}

function FormBloque({ inicial, onGuardar, onCerrar }: { inicial?: Bloque; onGuardar: (d: DatosBloque) => void; onCerrar: () => void }) {
  const [actividad, setActividad] = useState(inicial?.actividad ?? '');
  const [hora, setHora] = useState(inicial?.hora ?? '08:00');
  const [dias, setDias] = useState<number[]>(inicial?.dias ?? [0, 1, 2, 3, 4]);
  const [categoria, setCategoria] = useState<Categoria>(inicial?.categoria ?? 'Trabajo');
  const valido = actividad.trim() && hora && dias.length > 0;
  return (
    <Dialogo
      titulo={inicial ? 'Editar bloque de rutina' : 'Agregar a rutina'}
      acciones={
        <>
          <button className="boton-sec" onClick={onCerrar}>Cancelar</button>
          <button className="boton" disabled={!valido} onClick={() => { onGuardar({ actividad: actividad.trim().slice(0, 100), hora, dias: [...dias].sort(), categoria }); onCerrar(); }}>Guardar</button>
        </>
      }
    >
      <div className="space-y-3 text-stone-900 dark:text-stone-100">
        <label className="block">
          <span className="text-xs font-medium text-stone-500">Actividad</span>
          <input autoFocus className="campo mt-1" value={actividad} maxLength={100} placeholder="Ej. Gimnasio" onChange={(e) => setActividad(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-500">Hora</span>
          <input type="time" className="campo mt-1" value={hora} onChange={(e) => setHora(e.target.value)} />
        </label>
        <div>
          <span className="text-xs font-medium text-stone-500">Días de la semana</span>
          <div className="mt-1 flex gap-1">
            {DIAS.map((d, i) => {
              const activo = dias.includes(i);
              return (
                <button key={d} type="button" title={DIAS_LARGOS[i]} onClick={() => setDias(activo ? dias.filter((x) => x !== i) : [...dias, i])}
                  className={`h-10 flex-1 rounded-xl text-sm font-semibold ${activo ? 'bg-violet-600 text-white' : 'bg-stone-100 text-stone-500 dark:bg-stone-800'}`}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <span className="text-xs font-medium text-stone-500">Categoría</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {CATEGORIAS.map((c) => (
              <button key={c} type="button" onClick={() => setCategoria(c)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${categoria === c ? `${COLOR_CATEGORIA[c]} ring-2 ring-current/30` : 'bg-stone-100 text-stone-500 dark:bg-stone-800'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialogo>
  );
}

type Props = {
  nombre: string;
  notas: Nota[];
  nombreCarpeta: (id: string | null) => string | undefined;
  onAbrirNota: (id: string) => void;
  onNuevaNota: () => void;
  onAlternarElemento: (n: Nota, elId: string) => void;
  preguntar: (titulo: string, mensaje: string, textoSi: string, accion: () => void) => void;
};

export function Agenda({ nombre, notas, nombreCarpeta, onAbrirNota, onNuevaNota, onAlternarElemento, preguntar }: Props) {
  const { bloques, tareas, acciones } = useAgenda(nombre);
  const hoy = fechaLocal();
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [diaSel, setDiaSel] = useState(hoy);
  const [formBloque, setFormBloque] = useState<{ bloque?: Bloque } | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<string>('todas');

  const bloquesDe = (f: string) => bloques.filter((b) => b.dias.includes(diaSemana(f)));
  const tareasHoy = tareas
    .filter((t) => !t.hecha && t.fecha && t.fecha <= hoy)
    .sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad] || (a.fecha! < b.fecha! ? -1 : 1));
  const pendientes = tareas.filter((t) => !t.hecha).sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad] || a.creado_en.localeCompare(b.creado_en));
  const hechas = tareas.filter((t) => t.hecha).sort((a, b) => (b.hecha_en ?? '').localeCompare(a.hecha_en ?? ''));

  // Celdas del calendario (lunes a domingo)
  const celdas = useMemo(() => {
    const inicio = (mes.getDay() + 6) % 7;
    const total = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    return [...Array(inicio).fill(null), ...Array.from({ length: total }, (_, i) => fechaLocal(new Date(mes.getFullYear(), mes.getMonth(), i + 1)))];
  }, [mes]);
  const tieneAlgo = (f: string) => bloques.some((b) => b.dias.includes(diaSemana(f))) || tareas.some((t) => t.fecha === f && !t.hecha);

  const notasVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return notas
      .filter((n) => !n.eliminada_en)
      .filter((n) => filtro === 'todas' || (filtro === 'sin' ? !n.etiquetas.some((e) => ETIQUETAS_NOTA.includes(e)) : n.etiquetas.includes(filtro)))
      .filter((n) => !q || n.titulo.toLowerCase().includes(q) || textoPlano(n.contenido).toLowerCase().includes(q))
      .sort((a, b) => Number(b.etiquetas.includes('urgente')) - Number(a.etiquetas.includes('urgente')) || b.editado_en.localeCompare(a.editado_en));
  }, [notas, busqueda, filtro]);

  const eliminarBloque = (b: Bloque) => preguntar(`¿Eliminar "${b.actividad}"?`, 'Se quitará de la rutina de todos los días en que aparece.', 'Eliminar', () => acciones.eliminarBloque(b.id));

  return (
    <div className="space-y-4">
      {/* Navegación rápida dentro de la pestaña */}
      <nav className="flex gap-2 overflow-x-auto">
        {[['hoy', 'Hoy'], ['calendario', 'Calendario'], ['tareas', 'Tareas y notas']].map(([id, t]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium hover:border-violet-400 dark:border-stone-700 dark:bg-stone-900">{t}</a>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 1. HOY */}
        <div id="hoy" className="scroll-mt-24">
          <Seccion icono={<Sun size={20} />} titulo={`Hoy, ${fechaBonita(hoy)}`}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Rutina del día</h3>
            {bloquesDe(hoy).length === 0 ? (
              <p className="py-2 text-sm text-stone-400">No hay bloques de rutina para hoy.</p>
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {bloquesDe(hoy).map((b) => <FilaBloque key={b.id} b={b} fecha={hoy} onAlternar={() => acciones.alternarBloque(b, hoy)} />)}
              </ul>
            )}
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-400">Tareas de hoy y vencidas</h3>
            {tareasHoy.length === 0 ? (
              <p className="py-2 text-sm text-stone-400">Nada pendiente para hoy. 🎉</p>
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {tareasHoy.map((t) => <FilaTarea key={t.id} t={t} hoy={hoy} onAlternar={() => acciones.alternarTarea(t)} onBorrar={() => acciones.borrarTarea(t.id)} />)}
              </ul>
            )}
            <div className="mt-3"><FormTarea boton="Agregar para hoy" onCrear={(titulo, p) => acciones.crearTarea(titulo, p, hoy)} /></div>
          </Seccion>
        </div>

        {/* 2. CALENDARIO */}
        <div id="calendario" className="scroll-mt-24">
          <Seccion
            icono={<CalendarDays size={20} />}
            titulo="Calendario"
            accion={<button className="boton flex items-center gap-1 px-3 py-1.5" onClick={() => setFormBloque({})}><Plus size={16} /> Agregar a rutina</button>}
          >
            <div className="mb-2 flex items-center">
              <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
              <span className="flex-1 text-center font-semibold">{mayuscula(mes.toLocaleDateString('es', { month: 'long', year: 'numeric' }))}</span>
              <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {DIAS.map((d) => <span key={d} className="py-1 text-xs font-semibold text-stone-400">{d}</span>)}
              {celdas.map((f, i) =>
                f ? (
                  <button key={f} onClick={() => setDiaSel(f)}
                    className={`relative flex h-10 flex-col items-center justify-center rounded-xl text-sm ${
                      f === diaSel ? 'bg-violet-600 font-bold text-white' : f === hoy ? 'bg-violet-100 font-bold text-violet-800 dark:bg-violet-500/20 dark:text-violet-200' : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}>
                    {Number(f.slice(8))}
                    {tieneAlgo(f) && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${f === diaSel ? 'bg-white' : 'bg-violet-500'}`} />}
                  </button>
                ) : <span key={`v${i}`} />,
              )}
            </div>

            <h3 className="mt-4 text-sm font-semibold">{mayuscula(fechaBonita(diaSel))}</h3>
            {bloquesDe(diaSel).length === 0 && !tareas.some((t) => t.fecha === diaSel) ? (
              <p className="py-2 text-sm text-stone-400">Sin actividades este día.</p>
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {bloquesDe(diaSel).map((b) => (
                  <FilaBloque key={b.id} b={b} fecha={diaSel} onAlternar={() => acciones.alternarBloque(b, diaSel)} onEditar={() => setFormBloque({ bloque: b })} onEliminar={() => eliminarBloque(b)} />
                ))}
                {tareas.filter((t) => t.fecha === diaSel).map((t) => (
                  <FilaTarea key={t.id} t={t} hoy={hoy} onAlternar={() => acciones.alternarTarea(t)} onBorrar={() => acciones.borrarTarea(t.id)} />
                ))}
              </ul>
            )}
          </Seccion>
        </div>
      </div>

      {/* 3. TAREAS Y NOTAS */}
      <div id="tareas" className="grid scroll-mt-24 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Seccion
          icono={<ListTodo size={20} />}
          titulo="Pendientes"
          accion={hechas.length > 0 && (
            <button className="boton-sec px-3 py-1.5" onClick={() => preguntar('¿Borrar las tareas hechas?', `Se borrarán ${hechas.length} tareas completadas. No se puede deshacer.`, 'Borrar hechas', () => acciones.borrarHechas(hechas))}>
              Borrar hechas
            </button>
          )}
        >
          <FormTarea onCrear={(titulo, p) => acciones.crearTarea(titulo, p, null)} />
          {pendientes.length === 0 ? (
            <p className="py-3 text-sm text-stone-400">No hay pendientes.</p>
          ) : (
            <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
              {pendientes.map((t) => <FilaTarea key={t.id} t={t} hoy={hoy} onAlternar={() => acciones.alternarTarea(t)} onBorrar={() => acciones.borrarTarea(t.id)} />)}
            </ul>
          )}
          {hechas.length > 0 && (
            <>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-400">Hechas ({hechas.length})</h3>
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {hechas.map((t) => <FilaTarea key={t.id} t={t} onAlternar={() => acciones.alternarTarea(t)} onBorrar={() => acciones.borrarTarea(t.id)} />)}
              </ul>
            </>
          )}
        </Seccion>

        <Seccion icono={<Pencil size={20} />} titulo="Notas" accion={<button className="boton flex items-center gap-1 px-3 py-1.5" onClick={onNuevaNota}><Plus size={16} /> Nota</button>}>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input className="campo py-1.5 pl-9" placeholder="Buscar notas…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[['todas', 'Todas'], ...ETIQUETAS_NOTA.map((id) => [id, buscarEtiqueta(id)!.nombre]), ['sin', 'Sin etiqueta']].map(([id, t]) => {
              const e = buscarEtiqueta(id);
              const activo = filtro === id;
              return (
                <button key={id} onClick={() => setFiltro(id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${activo ? (e ? e.clase : 'bg-violet-600 text-white') : 'border border-stone-200 text-stone-600 dark:border-stone-700 dark:text-stone-300'}`}>
                  {e && <span className={`h-2 w-2 rounded-full ${e.punto}`} />} {t}
                </button>
              );
            })}
          </div>
          {notasVisibles.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-400">No hay notas que coincidan.</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {notasVisibles.map((n) => (
                <TarjetaNota key={n.id} nota={n} carpeta={nombreCarpeta(n.carpeta_id)} onAbrir={() => onAbrirNota(n.id)} onAlternar={(elId) => onAlternarElemento(n, elId)} />
              ))}
            </div>
          )}
        </Seccion>
      </div>

      {formBloque && (
        <FormBloque inicial={formBloque.bloque} onCerrar={() => setFormBloque(null)} onGuardar={(d) => acciones.guardarBloque(d, formBloque.bloque?.id)} />
      )}
    </div>
  );
}
