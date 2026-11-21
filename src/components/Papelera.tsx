import { Folder, FileText, RotateCcw, X } from 'lucide-react';
import type { Carpeta, Nota } from '../lib/tipos';

const diasRestantes = (fecha: string) => Math.max(0, 30 - Math.floor((Date.now() - new Date(fecha).getTime()) / 864e5));

type Props = {
  carpetas: Carpeta[];
  notas: Nota[];
  onRestaurarCarpeta: (c: Carpeta) => void;
  onRestaurarNota: (n: Nota) => void;
  onBorrarCarpeta: (c: Carpeta) => void;
  onBorrarNota: (n: Nota) => void;
  onVaciar: () => void;
};

export function Papelera(p: Props) {
  const carpetas = p.carpetas.filter((c) => c.eliminada_en);
  const notas = p.notas.filter((n) => n.eliminada_en).sort((a, b) => (b.eliminada_en! > a.eliminada_en! ? 1 : -1));
  const vacia = carpetas.length + notas.length === 0;

  const fila = (icono: React.ReactNode, titulo: string, sub: string, fecha: string, restaurar: () => void, borrar: () => void, clave: string) => (
    <li key={clave} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
      <span className="text-stone-400">{icono}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{titulo}</p>
        <p className="text-xs text-stone-500">{sub} · se borra en {diasRestantes(fecha)} días</p>
      </div>
      <button className="flex items-center gap-1 rounded-xl bg-violet-100 px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-100" onClick={restaurar}>
        <RotateCcw size={16} /> <span className="hidden sm:inline">Restaurar</span>
      </button>
      <button className="grid h-9 w-9 place-items-center rounded-xl text-stone-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20" onClick={borrar} aria-label="Borrar para siempre" title="Borrar para siempre">
        <X size={16} />
      </button>
    </li>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-stone-500">Lo que elimines se queda aquí 30 días. Puedes restaurarlo cuando quieras.</p>
        {!vacia && <button className="boton-peligro" onClick={p.onVaciar}>Vaciar papelera</button>}
      </div>
      {vacia ? (
        <p className="py-16 text-center text-stone-400">La papelera está vacía.</p>
      ) : (
        <ul className="space-y-2">
          {carpetas.map((c) =>
            fila(<Folder size={20} />, c.nombre, `Carpeta con ${p.notas.filter((n) => n.carpeta_id === c.id && n.eliminada_en).length} notas`, c.eliminada_en!, () => p.onRestaurarCarpeta(c), () => p.onBorrarCarpeta(c), c.id),
          )}
          {notas.map((n) =>
            fila(<FileText size={20} />, n.titulo || 'Sin título', `Nota de ${n.autor || '—'}`, n.eliminada_en!, () => p.onRestaurarNota(n), () => p.onBorrarNota(n), n.id),
          )}
        </ul>
      )}
    </div>
  );
}
