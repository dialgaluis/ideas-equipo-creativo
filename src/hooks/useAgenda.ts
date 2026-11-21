import { useEffect, useMemo, useState } from 'react';
import { arrayRemove, arrayUnion, collection, deleteDoc, doc, onSnapshot, runTransaction, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const CATEGORIAS = ['Gym', 'Contenido', 'Trabajo', 'Personal'] as const;
export type Categoria = (typeof CATEGORIAS)[number];
export type Prioridad = 'alta' | 'media' | 'baja';

export type Bloque = { id: string; actividad: string; hora: string; dias: number[]; categoria: Categoria; hechos: string[] };
export type DatosBloque = Pick<Bloque, 'actividad' | 'hora' | 'dias' | 'categoria'>;
export type Tarea = { id: string; titulo: string; prioridad: Prioridad; hecha: boolean; fecha: string | null; autor: string; creado_en: string; hecha_en: string | null };

const colRutina = collection(db, 'rutina');
const colTareas = collection(db, 'tareas');

/** Fecha local en formato AAAA-MM-DD. */
export const fechaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** 0 = lunes … 6 = domingo */
export const diaSemana = (fecha: string) => {
  const [a, m, d] = fecha.split('-').map(Number);
  return (new Date(a, m - 1, d).getDay() + 6) % 7;
};

const EJEMPLOS: DatosBloque[] = [
  { actividad: 'Gimnasio', hora: '07:00', dias: [0, 2, 4], categoria: 'Gym' },
  { actividad: 'Revisar correos y pendientes', hora: '09:00', dias: [0, 1, 2, 3, 4], categoria: 'Trabajo' },
  { actividad: 'Grabar contenido', hora: '16:00', dias: [1, 3, 5], categoria: 'Contenido' },
];

export function useAgenda(nombre: string) {
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);

  useEffect(() => {
    const offR = onSnapshot(colRutina, (s) =>
      setBloques(s.docs.map((d) => ({ hechos: [], dias: [], ...d.data(), id: d.id }) as unknown as Bloque).sort((a, b) => a.hora.localeCompare(b.hora))),
    );
    const offT = onSnapshot(colTareas, (s) => setTareas(s.docs.map((d) => ({ ...d.data(), id: d.id }) as Tarea)));

    // Bloques de ejemplo: solo la primera vez que alguien abre la agenda (una sola vez para todo el equipo)
    runTransaction(db, async (tx) => {
      const marca = doc(db, 'config', 'rutina');
      if ((await tx.get(marca)).exists()) return;
      tx.set(marca, { sembrado: true });
      EJEMPLOS.forEach((e) => tx.set(doc(colRutina), { ...e, hechos: [] }));
    }).catch(() => {});

    return () => {
      offR();
      offT();
    };
  }, []);

  const acciones = useMemo(() => {
    const ahora = () => new Date().toISOString();
    const avisar = (p: Promise<unknown>) => p.catch((e) => console.error(e));
    return {
      guardarBloque(datos: DatosBloque, id?: string) {
        if (id) avisar(updateDoc(doc(colRutina, id), { ...datos }));
        else avisar(setDoc(doc(colRutina), { ...datos, hechos: [] }));
      },
      eliminarBloque(id: string) {
        avisar(deleteDoc(doc(colRutina, id)));
      },
      alternarBloque(b: Bloque, fecha: string) {
        const hecho = b.hechos.includes(fecha);
        avisar(updateDoc(doc(colRutina, b.id), { hechos: hecho ? arrayRemove(fecha) : arrayUnion(fecha) }));
      },
      crearTarea(titulo: string, prioridad: Prioridad, fecha: string | null) {
        avisar(setDoc(doc(colTareas), { titulo: titulo.trim().slice(0, 200), prioridad, fecha, hecha: false, autor: nombre, creado_en: ahora(), hecha_en: null }));
      },
      alternarTarea(t: Tarea) {
        avisar(updateDoc(doc(colTareas, t.id), { hecha: !t.hecha, hecha_en: t.hecha ? null : ahora() }));
      },
      borrarTarea(id: string) {
        avisar(deleteDoc(doc(colTareas, id)));
      },
      borrarHechas(lista: Tarea[]) {
        const b = writeBatch(db);
        lista.filter((t) => t.hecha).slice(0, 450).forEach((t) => b.delete(doc(colTareas, t.id)));
        avisar(b.commit());
      },
    };
  }, [nombre]);

  return { bloques, tareas, acciones };
}
