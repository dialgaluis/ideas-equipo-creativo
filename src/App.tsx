import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Menu, Plus, Search, WifiOff, AlertTriangle, Loader2, X, Lightbulb } from 'lucide-react';
import { useDatos } from './hooks/useDatos';
import { useTema } from './hooks/useTema';
import { useConexion } from './hooks/useConexion';
import { firebaseConfigurado } from './lib/firebase';
import { leerNombre, guardarNombre } from './lib/usuario';
import { textoPlano } from './lib/sanitizar';
import { ETIQUETAS } from './lib/etiquetas';
import { exportarRespaldo, importarRespaldo } from './lib/respaldo';
import type { Carpeta, Nota, Vista } from './lib/tipos';
import { Bienvenida } from './components/Bienvenida';
import { BarraLateral } from './components/BarraLateral';
import { TarjetaNota } from './components/TarjetaNota';
import { EditorNota } from './components/EditorNota';
import { Papelera } from './components/Papelera';
import { Confirmar } from './components/Dialogo';

type Pregunta = { titulo: string; mensaje: ReactNode; textoSi: string; peligro?: boolean; accion: () => Promise<void> | void };

export default function App() {
  if (!firebaseConfigurado) return <FaltaConfigurar />;
  return <Aplicacion />;
}

function Aplicacion() {
  const [nombre, setNombre] = useState(leerNombre);
  const [pidiendoNombre, setPidiendoNombre] = useState(!leerNombre());
  const { carpetas, notas, estado, error, acciones } = useDatos();
  const tema = useTema();
  const enLinea = useConexion();

  const [vista, setVista] = useState<Vista>({ tipo: 'todas' });
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtiquetas, setFiltroEtiquetas] = useState<string[]>([]);
  const [filtroAutor, setFiltroAutor] = useState('');
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  const intentar = useCallback(async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) setAviso(ok);
    } catch (e) {
      setAviso(navigator.onLine ? `Error: ${e instanceof Error ? e.message : 'no se pudo completar'}` : 'Sin conexión. Inténtalo cuando vuelva internet.');
    }
  }, []);

  const carpetasActivas = useMemo(() => new Map(carpetas.filter((c) => !c.eliminada_en).map((c) => [c.id, c.nombre])), [carpetas]);
  const autores = useMemo(() => [...new Set(notas.filter((n) => !n.eliminada_en).map((n) => n.autor).filter(Boolean))].sort(), [notas]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return notas
      .filter((n) => !n.eliminada_en)
      .filter((n) => vista.tipo !== 'carpeta' || n.carpeta_id === vista.id)
      .filter((n) => !filtroAutor || n.autor === filtroAutor)
      .filter((n) => filtroEtiquetas.length === 0 || filtroEtiquetas.some((t) => n.etiquetas.includes(t)))
      .filter((n) => {
        if (!q) return true;
        return (
          n.titulo.toLowerCase().includes(q) ||
          textoPlano(n.contenido).toLowerCase().includes(q) ||
          n.elementos.some((e) => e.texto.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const ua = a.etiquetas.includes('urgente') ? 1 : 0;
        const ub = b.etiquetas.includes('urgente') ? 1 : 0;
        if (ua !== ub) return ub - ua; // urgentes primero
        return b.editado_en.localeCompare(a.editado_en);
      });
  }, [notas, vista, busqueda, filtroAutor, filtroEtiquetas]);

  const notaAbierta = abiertaId ? notas.find((n) => n.id === abiertaId) : undefined;

  const nuevaNota = () =>
    intentar(async () => {
      const n = await acciones.crearNota({ carpeta_id: vista.tipo === 'carpeta' ? vista.id : null }, nombre);
      setAbiertaId(n.id);
    });

  const eliminarCarpeta = (c: Carpeta) => {
    const cuantas = notas.filter((n) => n.carpeta_id === c.id && !n.eliminada_en).length;
    const hacer = () =>
      intentar(async () => {
        await acciones.eliminarCarpeta(c.id);
        if (vista.tipo === 'carpeta' && vista.id === c.id) setVista({ tipo: 'todas' });
      }, 'Carpeta enviada a la papelera.');
    if (cuantas === 0) return hacer();
    setPregunta({
      titulo: `¿Eliminar "${c.nombre}"?`,
      mensaje: <>La carpeta tiene <b>{cuantas} {cuantas === 1 ? 'nota' : 'notas'}</b>. Todo irá a la papelera y podrás restaurarlo durante 30 días.</>,
      textoSi: 'Enviar a la papelera',
      peligro: true,
      accion: hacer,
    });
  };

  const titulo = vista.tipo === 'todas' ? 'Todas las notas' : vista.tipo === 'papelera' ? 'Papelera' : carpetasActivas.get(vista.id) ?? 'Carpeta';
  const hayFiltros = busqueda || filtroAutor || filtroEtiquetas.length > 0;

  if (pidiendoNombre)
    return (
      <Bienvenida
        inicial={nombre}
        onListo={(n) => {
          guardarNombre(n);
          setNombre(n);
          setPidiendoNombre(false);
        }}
      />
    );

  return (
    <div className="flex min-h-screen">
      <BarraLateral
        carpetas={carpetas}
        notas={notas}
        vista={vista}
        nombre={nombre}
        tema={tema.pref}
        abierta={menu}
        onCerrar={() => setMenu(false)}
        onVista={setVista}
        onCrearCarpeta={(n) => intentar(() => acciones.crearCarpeta(n), 'Carpeta creada.')}
        onRenombrar={(c, n) => intentar(() => acciones.renombrarCarpeta(c.id, n))}
        onEliminar={eliminarCarpeta}
        onTema={tema.siguiente}
        onExportar={() => { exportarRespaldo(carpetas, notas); setAviso('Respaldo descargado.'); }}
        onImportar={(f) =>
          intentar(async () => {
            const r = await importarRespaldo(f, nombre);
            await acciones.recargar();
            setAviso(`Importado: ${r.notas} notas y ${r.carpetas} carpetas (se sumaron a las existentes).`);
          })
        }
        onCambiarNombre={() => setPidiendoNombre(true)}
      />

      <main className="min-w-0 flex-1">
        {/* Encabezado */}
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/90 px-4 pb-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-2">
            <button className="grid h-10 w-10 place-items-center rounded-xl hover:bg-stone-200 lg:hidden dark:hover:bg-stone-800" onClick={() => setMenu(true)} aria-label="Abrir menú">
              <Menu size={20} />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{titulo}</h1>
            {vista.tipo !== 'papelera' && (
              <button className="boton flex items-center gap-1" onClick={nuevaNota}>
                <Plus size={18} /> <span className="hidden sm:inline">Nueva nota</span>
              </button>
            )}
          </div>

          {vista.tipo !== 'papelera' && (
            <>
              <div className="relative mt-3">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input className="campo pl-10" placeholder="Buscar en títulos, textos y listas…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
              <div className="-mx-4 mt-2 flex items-center gap-1.5 overflow-x-auto px-4 pb-1">
                <select
                  className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs dark:border-stone-700 dark:bg-stone-900"
                  value={filtroAutor}
                  onChange={(e) => setFiltroAutor(e.target.value)}
                  aria-label="Filtrar por autor"
                >
                  <option value="">Todos los autores</option>
                  {autores.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                {ETIQUETAS.map((e) => {
                  const activa = filtroEtiquetas.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => setFiltroEtiquetas(activa ? filtroEtiquetas.filter((x) => x !== e.id) : [...filtroEtiquetas, e.id])}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                        activa ? e.clase : 'border border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${e.punto}`} /> {e.nombre}
                    </button>
                  );
                })}
                {hayFiltros && (
                  <button className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs text-violet-700 dark:text-violet-300" onClick={() => { setBusqueda(''); setFiltroAutor(''); setFiltroEtiquetas([]); }}>
                    <X size={12} /> Quitar filtros
                  </button>
                )}
              </div>
            </>
          )}
        </header>

        {!enLinea && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
            <WifiOff size={16} /> Sin conexión. Puedes ver tus notas, pero los cambios se guardarán cuando vuelva internet.
          </div>
        )}
        {estado === 'listo' && error && enLinea && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-500/20 dark:text-red-100">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <div className="p-4 pb-24">
          {estado === 'cargando' && (
            <div className="flex flex-col items-center gap-3 py-24 text-stone-400"><Loader2 className="animate-spin" size={28} /> Cargando notas…</div>
          )}

          {estado === 'error' && (
            <div className="mx-auto max-w-sm py-20 text-center">
              <AlertTriangle className="mx-auto text-red-500" size={32} />
              <p className="mt-3 font-semibold">No se pudieron cargar las notas</p>
              <p className="mt-1 text-sm text-stone-500">{error}</p>
              <button className="boton mt-4" onClick={() => acciones.recargar()}>Reintentar</button>
            </div>
          )}

          {estado === 'listo' && vista.tipo === 'papelera' && (
            <Papelera
              carpetas={carpetas}
              notas={notas}
              onRestaurarCarpeta={(c) => intentar(() => acciones.restaurarCarpeta(c), 'Carpeta restaurada con sus notas.')}
              onRestaurarNota={(n) => intentar(() => acciones.restaurarNota(n, !n.carpeta_id || carpetasActivas.has(n.carpeta_id)), 'Nota restaurada.')}
              onBorrarCarpeta={(c) =>
                setPregunta({ titulo: `¿Borrar "${c.nombre}" para siempre?`, mensaje: 'Se borrará la carpeta y las notas suyas que estén en la papelera. No se puede deshacer.', textoSi: 'Borrar para siempre', peligro: true, accion: () => intentar(() => acciones.borrarCarpetaDefinitivo(c.id)) })
              }
              onBorrarNota={(n) =>
                setPregunta({ titulo: '¿Borrar esta nota para siempre?', mensaje: `"${n.titulo || 'Sin título'}" se borrará y no se podrá recuperar.`, textoSi: 'Borrar para siempre', peligro: true, accion: () => intentar(() => acciones.borrarNotaDefinitivo(n.id)) })
              }
              onVaciar={() =>
                setPregunta({ titulo: '¿Vaciar la papelera?', mensaje: 'Todo lo que está en la papelera se borrará para siempre. No se puede deshacer. Te recomendamos exportar un respaldo antes.', textoSi: 'Vaciar papelera', peligro: true, accion: () => intentar(() => acciones.vaciarPapelera(), 'Papelera vaciada.') })
              }
            />
          )}

          {estado === 'listo' && vista.tipo !== 'papelera' && visibles.length === 0 && (
            <div className="mx-auto max-w-sm py-20 text-center text-stone-500">
              <Lightbulb className="mx-auto text-violet-400" size={36} />
              {hayFiltros ? (
                <p className="mt-3">Ninguna nota coincide con la búsqueda o los filtros.</p>
              ) : (
                <>
                  <p className="mt-3 font-semibold text-stone-700 dark:text-stone-300">Aún no hay notas aquí</p>
                  <p className="mt-1 text-sm">Crea la primera idea del equipo.</p>
                  <button className="boton mt-4" onClick={nuevaNota}>Crear nota</button>
                </>
              )}
            </div>
          )}

          {estado === 'listo' && vista.tipo !== 'papelera' && visibles.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibles.map((n: Nota) => (
                <TarjetaNota
                  key={n.id}
                  nota={n}
                  carpeta={n.carpeta_id ? carpetasActivas.get(n.carpeta_id) : undefined}
                  onAbrir={() => setAbiertaId(n.id)}
                  onAlternar={(elId) => intentar(() => acciones.alternarElemento(n, elId, nombre))}
                />
              ))}
            </div>
          )}
        </div>

        {vista.tipo !== 'papelera' && (
          <button className="fixed bottom-5 right-5 z-20 grid h-14 w-14 place-items-center rounded-full bg-violet-600 text-white shadow-lg sm:hidden" style={{ marginBottom: 'env(safe-area-inset-bottom)' }} onClick={nuevaNota} aria-label="Nueva nota">
            <Plus size={26} />
          </button>
        )}
      </main>

      {notaAbierta && (
        <EditorNota key={notaAbierta.id} nota={notaAbierta} carpetas={carpetas} nombre={nombre} acciones={acciones} onCerrar={() => setAbiertaId(null)} onAviso={setAviso} />
      )}

      {pregunta && (
        <Confirmar
          titulo={pregunta.titulo}
          mensaje={pregunta.mensaje}
          textoSi={pregunta.textoSi}
          peligro={pregunta.peligro}
          onNo={() => setPregunta(null)}
          onSi={async () => {
            const p = pregunta;
            setPregunta(null);
            await p.accion();
          }}
        />
      )}

      {aviso && (
        <div className="fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 sm:bottom-6" role="status">
          <div className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm text-white shadow-lg dark:bg-stone-100 dark:text-stone-900">{aviso}</div>
        </div>
      )}
    </div>
  );
}

function FaltaConfigurar() {
  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-bold">Falta conectar Firebase</h1>
      <p className="mt-3 text-stone-600 dark:text-stone-400">
        La app no encuentra la configuración de Firebase. Crea un archivo <code>.env</code> (copiando <code>.env.example</code>),
        pega los datos de tu app web de Firebase y reinicia con <code>npm run dev</code>.
      </p>
      <p className="mt-3 text-stone-600 dark:text-stone-400">En GitHub: agrega esos datos en Settings → Secrets and variables → Actions → Variables y vuelve a publicar.</p>
      <p className="mt-3 text-sm text-stone-500">Instrucciones completas en el archivo GUIA-FIREBASE.md.</p>
    </div>
  );
}
