import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { Elemento } from '../lib/tipos';
import { nuevoId } from '../lib/usuario';

export function Progreso({ elementos }: { elementos: Elemento[] }) {
  const listos = elementos.filter((e) => e.hecho).length;
  const pct = elementos.length ? Math.round((listos / elementos.length) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs font-medium text-stone-500">{listos}/{elementos.length} listos</span>
    </div>
  );
}

export function ListaElementos({ elementos, onCambiar }: { elementos: Elemento[]; onCambiar: (e: Elemento[]) => void }) {
  const [nuevo, setNuevo] = useState('');

  const agregar = () => {
    const texto = nuevo.trim();
    if (!texto) return;
    onCambiar([...elementos, { id: nuevoId(), texto, hecho: false }]);
    setNuevo('');
  };

  return (
    <div className="space-y-2">
      {elementos.length > 0 && <Progreso elementos={elementos} />}
      <ul className="space-y-1">
        {elementos.map((el) => (
          <li key={el.id} className="group flex items-center gap-2 rounded-lg px-1 hover:bg-stone-50 dark:hover:bg-stone-800/50">
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 accent-violet-600"
              checked={el.hecho}
              onChange={() => onCambiar(elementos.map((e) => (e.id === el.id ? { ...e, hecho: !e.hecho } : e)))}
              aria-label={`Marcar ${el.texto}`}
            />
            <input
              className={`min-w-0 flex-1 bg-transparent py-1.5 outline-none ${el.hecho ? 'text-stone-400 line-through' : ''}`}
              value={el.texto}
              onChange={(ev) => onCambiar(elementos.map((e) => (e.id === el.id ? { ...e, texto: ev.target.value } : e)))}
            />
            <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 hover:bg-stone-200 hover:text-red-600 dark:hover:bg-stone-700" onClick={() => onCambiar(elementos.filter((e) => e.id !== el.id))} aria-label="Quitar elemento">
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 px-1">
        <Plus size={18} className="shrink-0 text-stone-400" />
        <input
          className="min-w-0 flex-1 bg-transparent py-1.5 outline-none placeholder:text-stone-400"
          placeholder="Agregar elemento y pulsar Enter"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregar();
            }
          }}
          onBlur={agregar}
        />
      </div>
    </div>
  );
}
