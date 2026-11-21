import { useRef, useState } from 'react';
import { FileText, Folder, FolderPlus, Pencil, Trash2, Sun, Moon, MonitorSmartphone, Download, Upload, UserRound, X, Lightbulb } from 'lucide-react';
import type { Carpeta, Nota, Vista } from '../lib/tipos';
import type { Preferencia } from '../hooks/useTema';

type Props = {
  carpetas: Carpeta[];
  notas: Nota[];
  vista: Vista;
  nombre: string;
  tema: Preferencia;
  abierta: boolean;
  onCerrar: () => void;
  onVista: (v: Vista) => void;
  onCrearCarpeta: (nombre: string) => void;
  onRenombrar: (c: Carpeta, nombre: string) => void;
  onEliminar: (c: Carpeta) => void;
  onTema: () => void;
  onExportar: () => void;
  onImportar: (f: File) => void;
  onCambiarNombre: () => void;
};

export function BarraLateral(p: Props) {
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const archivo = useRef<HTMLInputElement>(null);

  const activas = p.notas.filter((n) => !n.eliminada_en);
  const enPapelera = p.notas.filter((n) => n.eliminada_en).length + p.carpetas.filter((c) => c.eliminada_en).length;
  const carpetas = p.carpetas.filter((c) => !c.eliminada_en).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const item = (activo: boolean) =>
    `group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
      activo ? 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-100' : 'hover:bg-stone-100 dark:hover:bg-stone-800'
    }`;

  const elegir = (v: Vista) => {
    p.onVista(v);
    p.onCerrar();
  };

  const terminarCrear = () => {
    if (texto.trim()) p.onCrearCarpeta(texto.trim().slice(0, 80));
    setCreando(false);
    setTexto('');
  };
  const terminarRenombrar = (c: Carpeta) => {
    if (texto.trim() && texto.trim() !== c.nombre) p.onRenombrar(c, texto.trim().slice(0, 80));
    setEditando(null);
    setTexto('');
  };

  const IconoTema = p.tema === 'claro' ? Sun : p.tema === 'oscuro' ? Moon : MonitorSmartphone;
  const textoTema = p.tema === 'claro' ? 'Tema claro' : p.tema === 'oscuro' ? 'Tema oscuro' : 'Tema automático';

  return (
    <>
      {p.abierta && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={p.onCerrar} />}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-stone-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 dark:border-stone-800 dark:bg-stone-900 ${
          p.abierta ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-white"><Lightbulb size={20} /></div>
          <span className="flex-1 font-bold leading-tight">Ideas del equipo creativo</span>
          <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-stone-100 lg:hidden dark:hover:bg-stone-800" onClick={p.onCerrar} aria-label="Cerrar menú"><X size={18} /></button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          <button className={item(p.vista.tipo === 'todas')} onClick={() => elegir({ tipo: 'todas' })}>
            <FileText size={18} /> <span className="flex-1">Todas las notas</span> <span className="text-xs text-stone-400">{activas.length}</span>
          </button>

          <div className="flex items-center justify-between px-3 pb-1 pt-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Carpetas</span>
            <button className="grid h-7 w-7 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800" onClick={() => { setCreando(true); setTexto(''); }} aria-label="Nueva carpeta" title="Nueva carpeta">
              <FolderPlus size={16} />
            </button>
          </div>

          {creando && (
            <input
              autoFocus
              className="campo py-1.5 text-sm"
              placeholder="Nombre de la carpeta"
              value={texto}
              maxLength={80}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') terminarCrear(); if (e.key === 'Escape') setCreando(false); }}
              onBlur={terminarCrear}
            />
          )}

          {carpetas.length === 0 && !creando && <p className="px-3 py-1 text-xs text-stone-400">Aún no hay carpetas.</p>}

          {carpetas.map((c) =>
            editando === c.id ? (
              <input
                key={c.id}
                autoFocus
                className="campo py-1.5 text-sm"
                value={texto}
                maxLength={80}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') terminarRenombrar(c); if (e.key === 'Escape') setEditando(null); }}
                onBlur={() => terminarRenombrar(c)}
              />
            ) : (
              <div key={c.id} className={item(p.vista.tipo === 'carpeta' && p.vista.id === c.id)}>
                <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => elegir({ tipo: 'carpeta', id: c.id })}>
                  <Folder size={18} className="shrink-0" /> <span className="truncate">{c.nombre}</span>
                  <span className="ml-auto text-xs text-stone-400">{activas.filter((n) => n.carpeta_id === c.id).length}</span>
                </button>
                <button className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-700" onClick={() => { setEditando(c.id); setTexto(c.nombre); }} aria-label={`Renombrar ${c.nombre}`} title="Renombrar">
                  <Pencil size={14} />
                </button>
                <button className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-stone-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20" onClick={() => p.onEliminar(c)} aria-label={`Eliminar ${c.nombre}`} title="Eliminar">
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          )}

          <div className="pt-4">
            <button className={item(p.vista.tipo === 'papelera')} onClick={() => elegir({ tipo: 'papelera' })}>
              <Trash2 size={18} /> <span className="flex-1">Papelera</span> {enPapelera > 0 && <span className="text-xs text-stone-400">{enPapelera}</span>}
            </button>
          </div>
        </nav>

        <div className="space-y-1 border-t border-stone-200 p-3 dark:border-stone-800" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <button className={item(false)} onClick={p.onTema}><IconoTema size={18} /> {textoTema}</button>
          <button className={item(false)} onClick={p.onExportar}><Download size={18} /> Exportar respaldo</button>
          <button className={item(false)} onClick={() => archivo.current?.click()}><Upload size={18} /> Importar respaldo</button>
          <input
            ref={archivo}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) p.onImportar(f);
              e.target.value = '';
            }}
          />
          <button className={item(false)} onClick={p.onCambiarNombre}><UserRound size={18} /> <span className="truncate">Eres: {p.nombre}</span></button>
        </div>
      </aside>
    </>
  );
}
