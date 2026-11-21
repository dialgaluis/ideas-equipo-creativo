import { memo } from 'react';
import { Folder } from 'lucide-react';
import type { Nota } from '../lib/tipos';
import { textoPlano } from '../lib/sanitizar';
import { Chip } from './Etiquetas';
import { Progreso } from './ListaElementos';

type Props = {
  nota: Nota;
  carpeta?: string;
  onAbrir: () => void;
  onAlternar: (elementoId: string) => void;
};

export const TarjetaNota = memo(function TarjetaNota({ nota, carpeta, onAbrir, onAlternar }: Props) {
  const resumen = textoPlano(nota.contenido).slice(0, 180);
  const urgente = nota.etiquetas.includes('urgente');
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && onAbrir()}
      className={`flex cursor-pointer flex-col gap-2.5 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-stone-900 ${
        urgente ? 'border-red-300 dark:border-red-500/50' : 'border-stone-200 dark:border-stone-800'
      }`}
    >
      {nota.etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1">{nota.etiquetas.map((id) => <Chip key={id} id={id} pequeno />)}</div>
      )}
      <h3 className={`font-semibold leading-snug ${nota.titulo ? '' : 'text-stone-400'}`}>{nota.titulo || 'Sin título'}</h3>
      {resumen && <p className="line-clamp-3 text-sm text-stone-600 dark:text-stone-400">{resumen}</p>}

      {nota.elementos.length > 0 && (
        <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <Progreso elementos={nota.elementos} />
          <ul className="space-y-0.5">
            {nota.elementos.slice(0, 4).map((el) => (
              <li key={el.id}>
                <label className="flex cursor-pointer items-center gap-2 py-0.5 text-sm">
                  <input type="checkbox" className="h-4 w-4 shrink-0 accent-violet-600" checked={el.hecho} onChange={() => onAlternar(el.id)} />
                  <span className={`truncate ${el.hecho ? 'text-stone-400 line-through' : ''}`}>{el.texto}</span>
                </label>
              </li>
            ))}
          </ul>
          {nota.elementos.length > 4 && <p className="text-xs text-stone-400">+{nota.elementos.length - 4} más</p>}
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-1 text-[11px] text-stone-400">
        {carpeta && <span className="flex min-w-0 items-center gap-1 truncate"><Folder size={12} />{carpeta}</span>}
        <span className="ml-auto shrink-0">{nota.editado_por || nota.autor} · {new Date(nota.editado_en).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
      </div>
    </article>
  );
});
