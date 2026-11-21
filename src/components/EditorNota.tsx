import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { ArrowLeft, Trash2, Users, CloudOff, Check, Loader2, ListChecks, Tag } from 'lucide-react';
import { BarraEditor } from './BarraEditor';
import { ListaElementos } from './ListaElementos';
import { SelectorEtiquetas } from './Etiquetas';
import { Dialogo } from './Dialogo';
import { supabase } from '../lib/supabase';
import { limpiarPegado, sanitizar } from '../lib/sanitizar';
import type { Acciones } from '../hooks/useDatos';
import type { CamposNota, Carpeta, Elemento, Nota } from '../lib/tipos';

type Props = {
  nota: Nota; // versión "en vivo" que llega por tiempo real
  carpetas: Carpeta[];
  nombre: string;
  acciones: Acciones;
  onCerrar: () => void;
  onAviso: (texto: string) => void;
};

type EstadoGuardado = 'guardado' | 'pendiente' | 'guardando' | 'error';

/** Mantiene a quién más tiene abierta esta nota (presencia en tiempo real). */
function usePresencia(notaId: string, nombre: string) {
  const [otros, setOtros] = useState<string[]>([]);
  useEffect(() => {
    const yo = crypto.randomUUID();
    const canal = supabase.channel(`nota-${notaId}`, { config: { presence: { key: yo } } });
    canal
      .on('presence', { event: 'sync' }, () => {
        const estado = canal.presenceState<{ nombre: string }>();
        const nombres = Object.entries(estado)
          .filter(([clave]) => clave !== yo)
          .flatMap(([, v]) => v.map((x) => x.nombre));
        setOtros([...new Set(nombres)]);
      })
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') canal.track({ nombre });
      });
    return () => {
      supabase.removeChannel(canal);
    };
  }, [notaId, nombre]);
  return otros;
}

export function EditorNota({ nota, carpetas, nombre, acciones, onCerrar, onAviso }: Props) {
  const [titulo, setTitulo] = useState(nota.titulo);
  const [carpetaId, setCarpetaId] = useState(nota.carpeta_id);
  const [etiquetas, setEtiquetas] = useState(nota.etiquetas);
  const [elementos, setElementos] = useState<Elemento[]>(nota.elementos);
  const [mostrarLista, setMostrarLista] = useState(nota.elementos.length > 0);
  const [mostrarEtiquetas, setMostrarEtiquetas] = useState(false);
  const [estado, setEstado] = useState<EstadoGuardado>('guardado');
  const [conflicto, setConflicto] = useState<Nota | null>(null);
  const [cambios, setCambios] = useState(0);
  const otros = usePresencia(nota.id, nombre);

  const version = useRef(nota.version);
  const sucio = useRef(false);
  const guardando = useRef(false);
  const conflictoRef = useRef<Nota | null>(null);
  conflictoRef.current = conflicto;
  const actual = useRef({ titulo, carpetaId, etiquetas, elementos });
  actual.current = { titulo, carpetaId, etiquetas, elementos };

  const marcar = () => {
    sucio.current = true;
    setEstado('pendiente');
    setCambios((n) => n + 1);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } }),
    ],
    content: sanitizar(nota.contenido),
    editorProps: {
      attributes: { class: 'contenido-nota min-h-[40vh] py-4 text-[16px]' },
      transformPastedHTML: limpiarPegado,
    },
    onUpdate: marcar,
  });

  const leerCampos = useCallback((): CamposNota => ({
    titulo: actual.current.titulo,
    carpeta_id: actual.current.carpetaId,
    etiquetas: actual.current.etiquetas,
    elementos: actual.current.elementos.filter((e) => e.texto.trim()),
    contenido: editor ? sanitizar(editor.getHTML()) : nota.contenido,
  }), [editor, nota.contenido]);

  const cargarDesde = useCallback((n: Nota) => {
    setTitulo(n.titulo);
    setCarpetaId(n.carpeta_id);
    setEtiquetas(n.etiquetas);
    setElementos(n.elementos);
    if (n.elementos.length) setMostrarLista(true);
    editor?.commands.setContent(sanitizar(n.contenido), false);
    version.current = n.version;
  }, [editor]);

  const guardar = useCallback(async (): Promise<boolean> => {
    if (!sucio.current) return true;
    if (guardando.current || conflictoRef.current) return false;
    guardando.current = true;
    setEstado('guardando');
    sucio.current = false;
    const r = await acciones.guardarNota(nota.id, leerCampos(), version.current, nombre);
    guardando.current = false;
    if (r.tipo === 'ok') {
      version.current = r.nota.version;
      if (sucio.current) {
        setEstado('pendiente');
        setCambios((n) => n + 1);
      } else setEstado('guardado');
      return true;
    }
    sucio.current = true;
    if (r.tipo === 'conflicto') {
      setConflicto(r.actual);
      setEstado('pendiente');
    } else setEstado('error');
    return false;
  }, [acciones, leerCampos, nombre, nota.id]);

  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;

  // Guardado automático: 800 ms después del último cambio
  useEffect(() => {
    if (!cambios) return;
    const t = setTimeout(() => guardarRef.current(), 800);
    return () => clearTimeout(t);
  }, [cambios]);

  // Reintenta al recuperar internet
  useEffect(() => {
    const reintentar = () => guardarRef.current();
    window.addEventListener('online', reintentar);
    return () => window.removeEventListener('online', reintentar);
  }, []);

  // Aviso del navegador si se cierra la pestaña con cambios sin guardar
  useEffect(() => {
    const avisar = (e: BeforeUnloadEvent) => {
      if (sucio.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, []);

  // Cambios de otra persona: si yo no tengo cambios pendientes, los muestro al instante.
  useEffect(() => {
    if (nota.version > version.current && !sucio.current && !guardando.current) {
      cargarDesde(nota);
    }
  }, [nota, cargarDesde]);

  const cerrar = async () => {
    const ok = await guardar();
    if (!ok && !conflictoRef.current) {
      if (!window.confirm('No se pudo guardar el último cambio (¿sin conexión?). Si cierras ahora se perderá. ¿Cerrar igual?')) return;
    }
    if (!conflictoRef.current) onCerrar();
  };

  // Resolver conflicto: nunca se pierde texto; la versión que "pierde" se guarda como copia.
  const quedarmeConLaMia = async (otra: Nota) => {
    try {
      await acciones.crearNota({ ...otra, titulo: `${otra.titulo || 'Sin título'} (versión de ${otra.editado_por || 'otra persona'})` }, otra.editado_por || nombre);
      version.current = otra.version;
      setConflicto(null);
      conflictoRef.current = null;
      sucio.current = true;
      await guardar();
      onAviso('Se guardó tu versión. La otra quedó como copia.');
    } catch {
      onAviso('No se pudo resolver. Revisa tu conexión e inténtalo de nuevo.');
    }
  };
  const usarLaOtra = async (otra: Nota) => {
    try {
      const mia = leerCampos();
      await acciones.crearNota({ ...mia, titulo: `${mia.titulo || 'Sin título'} (mi copia)` }, nombre);
      sucio.current = false;
      cargarDesde(otra);
      setConflicto(null);
      setEstado('guardado');
      onAviso('Se cargó la otra versión. Tu texto quedó guardado como copia.');
    } catch {
      onAviso('No se pudo resolver. Revisa tu conexión e inténtalo de nuevo.');
    }
  };

  const enviarAPapelera = async () => {
    try {
      await acciones.moverAPapelera(nota);
      onAviso('Nota enviada a la papelera.');
      onCerrar();
    } catch {
      onAviso('No se pudo eliminar. Revisa tu conexión.');
    }
  };

  const carpetasActivas = carpetas.filter((c) => !c.eliminada_en);

  return (
    <div className="fixed inset-0 z-40 flex justify-center bg-black/30 sm:p-6" onClick={cerrar}>
      <div
        className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center gap-2 border-b border-stone-200 px-3 py-2 dark:border-stone-800" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
          <button className="grid h-10 w-10 place-items-center rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800" onClick={cerrar} aria-label="Cerrar nota">
            <ArrowLeft size={20} />
          </button>
          <EstadoChip estado={estado} />
          <div className="flex-1" />
          {otros.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
              <Users size={14} /> {otros.join(', ')} también {otros.length > 1 ? 'están' : 'está'} aquí
            </span>
          )}
          <button className="grid h-10 w-10 place-items-center rounded-xl text-stone-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" onClick={enviarAPapelera} aria-label="Enviar a la papelera" title="Enviar a la papelera">
            <Trash2 size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-10 sm:px-8">
          {nota.eliminada_en && (
            <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">Alguien envió esta nota a la papelera.</p>
          )}
          <input
            className="mt-4 w-full bg-transparent text-2xl font-bold outline-none placeholder:text-stone-300 dark:placeholder:text-stone-600"
            placeholder="Título"
            value={titulo}
            maxLength={300}
            onChange={(e) => { setTitulo(e.target.value); marcar(); }}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <select
              className="rounded-lg border border-stone-200 bg-transparent px-2 py-1.5 dark:border-stone-700 dark:bg-stone-900"
              value={carpetaId ?? ''}
              onChange={(e) => { setCarpetaId(e.target.value || null); marcar(); }}
              aria-label="Carpeta"
            >
              <option value="">Sin carpeta</option>
              {carpetasActivas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <button className={`flex items-center gap-1 rounded-lg px-2 py-1.5 ${mostrarEtiquetas ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200' : 'hover:bg-stone-100 dark:hover:bg-stone-800'}`} onClick={() => setMostrarEtiquetas(!mostrarEtiquetas)}>
              <Tag size={16} /> Etiquetas{etiquetas.length ? ` (${etiquetas.length})` : ''}
            </button>
            <button className={`flex items-center gap-1 rounded-lg px-2 py-1.5 ${mostrarLista ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200' : 'hover:bg-stone-100 dark:hover:bg-stone-800'}`} onClick={() => setMostrarLista(!mostrarLista)}>
              <ListChecks size={16} /> Lista
            </button>
          </div>

          {mostrarEtiquetas && (
            <div className="mt-3 rounded-xl bg-stone-50 p-3 dark:bg-stone-800/50">
              <SelectorEtiquetas seleccion={etiquetas} onCambiar={(v) => { setEtiquetas(v); marcar(); }} />
            </div>
          )}

          {mostrarLista && (
            <div className="mt-3 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
              <ListaElementos elementos={elementos} onCambiar={(v) => { setElementos(v); marcar(); }} />
            </div>
          )}

          <div className="mt-4">
            {editor && <BarraEditor editor={editor} />}
            <EditorContent editor={editor} />
          </div>

          <p className="mt-6 text-xs text-stone-400">
            Creada por {nota.autor || '—'} el {new Date(nota.creado_en).toLocaleString('es')} · Última edición: {nota.editado_por || '—'}, {new Date(nota.editado_en).toLocaleString('es')}
          </p>
        </div>
      </div>

      {conflicto && (
        <div onClick={(e) => e.stopPropagation()}>
          <Dialogo
            titulo="Alguien más editó esta nota"
            acciones={
              <>
                <button className="boton-sec" onClick={() => usarLaOtra(conflicto)}>Ver la de {conflicto.editado_por || 'la otra persona'}</button>
                <button className="boton" onClick={() => quedarmeConLaMia(conflicto)}>Quedarme con la mía</button>
              </>
            }
          >
            <p><b>{conflicto.editado_por || 'Otra persona'}</b> guardó cambios en esta nota mientras tú también escribías.</p>
            <p className="mt-2">Elige qué versión se queda. <b>No se pierde nada:</b> la otra versión se guarda automáticamente como una nota copia.</p>
          </Dialogo>
        </div>
      )}
    </div>
  );
}

function EstadoChip({ estado }: { estado: EstadoGuardado }) {
  if (estado === 'guardando' || estado === 'pendiente')
    return <span className="flex items-center gap-1 text-xs text-stone-500"><Loader2 size={14} className="animate-spin" /> Guardando…</span>;
  if (estado === 'error')
    return <span className="flex items-center gap-1 text-xs text-red-600"><CloudOff size={14} /> Sin guardar: se reintentará</span>;
  return <span className="flex items-center gap-1 text-xs text-emerald-600"><Check size={14} /> Guardado</span>;
}
