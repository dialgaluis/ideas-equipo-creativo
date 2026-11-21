import { useEffect, useState } from 'react';
import { deleteDoc, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { colPresencia } from '../lib/firebase';

const CADA = 15_000; // avisa "sigo aquí" cada 15 segundos
const VENCE = 40_000; // si no avisa en 40 segundos, ya no está

/** Muestra quién más tiene abierta esta nota. */
export function usePresencia(notaId: string, nombre: string) {
  const [otros, setOtros] = useState<string[]>([]);

  useEffect(() => {
    const yo = doc(colPresencia);
    const latido = () => setDoc(yo, { nota_id: notaId, nombre, visto: new Date().toISOString() }).catch(() => {});
    latido();
    const t = setInterval(latido, CADA);

    let docs: { id: string; nombre: string; visto: string }[] = [];
    const calcular = () => {
      const limite = new Date(Date.now() - VENCE).toISOString();
      setOtros([...new Set(docs.filter((d) => d.id !== yo.id && d.visto > limite).map((d) => d.nombre))]);
    };
    const off = onSnapshot(query(colPresencia, where('nota_id', '==', notaId)), (s) => {
      docs = s.docs.map((d) => ({ id: d.id, ...(d.data() as { nombre: string; visto: string }) }));
      calcular();
    }, () => {});
    const t2 = setInterval(calcular, CADA);

    return () => {
      clearInterval(t);
      clearInterval(t2);
      off();
      deleteDoc(yo).catch(() => {});
    };
  }, [notaId, nombre]);

  return otros;
}
