export type Etiqueta = { id: string; nombre: string; clase: string; punto: string };

export const GRUPOS_ETIQUETAS: { grupo: string; etiquetas: Etiqueta[] }[] = [
  {
    grupo: 'Prioridad',
    etiquetas: [
      { id: 'importante', nombre: 'Importante', clase: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200', punto: 'bg-amber-500' },
      { id: 'muy-importante', nombre: 'Muy importante', clase: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200', punto: 'bg-orange-500' },
      { id: 'urgente', nombre: 'Urgente', clase: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200', punto: 'bg-red-500' },
      { id: 'analizar', nombre: 'Analizar', clase: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200', punto: 'bg-sky-500' },
    ],
  },
  {
    grupo: 'Plazo',
    etiquetas: [
      { id: 'ahora', nombre: 'Hacerlo ahora', clase: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-200', punto: 'bg-fuchsia-500' },
      { id: 'manana', nombre: 'Para mañana', clase: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200', punto: 'bg-violet-500' },
      { id: 'semana', nombre: 'Para esta semana', clase: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200', punto: 'bg-emerald-500' },
      { id: 'mes', nombre: 'Para este mes', clase: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200', punto: 'bg-teal-500' },
    ],
  },
];

export const ETIQUETAS = GRUPOS_ETIQUETAS.flatMap((g) => g.etiquetas);
export const buscarEtiqueta = (id: string) => ETIQUETAS.find((e) => e.id === id);
