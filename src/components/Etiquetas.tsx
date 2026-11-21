import { Check } from 'lucide-react';
import { GRUPOS_ETIQUETAS, buscarEtiqueta } from '../lib/etiquetas';

export function Chip({ id, pequeno }: { id: string; pequeno?: boolean }) {
  const e = buscarEtiqueta(id);
  if (!e) return null;
  return <span className={`inline-flex items-center rounded-full font-medium ${pequeno ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'} ${e.clase}`}>{e.nombre}</span>;
}

export function SelectorEtiquetas({ seleccion, onCambiar }: { seleccion: string[]; onCambiar: (ids: string[]) => void }) {
  const alternar = (id: string) => onCambiar(seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id]);
  return (
    <div className="space-y-2">
      {GRUPOS_ETIQUETAS.map((g) => (
        <div key={g.grupo} className="flex flex-wrap items-center gap-1.5">
          <span className="w-16 shrink-0 text-xs font-medium text-stone-500">{g.grupo}</span>
          {g.etiquetas.map((e) => {
            const activa = seleccion.includes(e.id);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => alternar(e.id)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  activa ? `${e.clase} ring-2 ring-current/30` : 'bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
                }`}
              >
                {activa && <Check size={12} />}
                {e.nombre}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
