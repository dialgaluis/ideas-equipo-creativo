import { useEffect, useMemo, useRef, useState } from 'react';
import { deleteDoc, doc, getDocs, onSnapshot, query, runTransaction, updateDoc, where, writeBatch, setDoc, type WriteBatch } from 'firebase/firestore';
import { db, colCarpetas, colNotas, colPresencia, mensajeError } from '../lib/firebase';
import { sanitizar } from '../lib/sanitizar';
import type { CamposNota, Carpeta, Elemento, Nota, ResultadoGuardar } from '../lib/tipos';

const DIAS_PAPELERA = 30;
const ahora = () => new Date().toISOString();

function normalizar(n: Partial<Nota> & { id: string }): Nota {
  return {
    titulo: '', carpeta_id: null, contenido: '', autor: '', editado_por: '', creado_en: ahora(), editado_en: ahora(), version: 1, eliminada_en: null,
    ...n,
    etiquetas: Array.isArray(n.etiquetas) ? n.etiquetas : [],
    elementos: Array.isArray(n.elementos) ? n.elementos : [],
  };
}

/** Ejecuta lotes de escritura en grupos de 450 (Firestore permite 500 por lote). */
async function enLotes<T>(items: T[], fn: (b: WriteBatch, item: T) => void) {
  for (let i = 0; i < items.length; i += 450) {
    const b = writeBatch(db);
    items.slice(i, i + 450).forEach((it) => fn(b, it));
    await b.commit();
  }
}

export function useDatos() {
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const purgado = useRef(false);

  // Tiempo real: Firestore avisa cada cambio al instante
  useEffect(() => {
    const fallo = (e: unknown) => {
      setError(mensajeError(e));
      setEstado((s) => (s === 'listo' ? 'listo' : 'error'));
    };
    const offC = onSnapshot(colCarpetas, (s) => setCarpetas(s.docs.map((d) => ({ id: d.id, eliminada_en: null, ...d.data() }) as Carpeta)), fallo);
    const offN = onSnapshot(
      colNotas,
      (s) => {
        setNotas(s.docs.map((d) => normalizar({ id: d.id, ...d.data() })));
        setEstado('listo');
        setError('');
      },
      fallo,
    );
    return () => {
      offC();
      offN();
    };
  }, [intento]);

  // Limpieza: borra de verdad lo que lleva más de 30 días en la papelera y presencias viejas
  useEffect(() => {
    if (estado !== 'listo' || purgado.current) return;
    purgado.current = true;
    const limite = new Date(Date.now() - DIAS_PAPELERA * 864e5).toISOString();
    (async () => {
      try {
        const viejas = [
          ...(await getDocs(query(colNotas, where('eliminada_en', '<', limite)))).docs,
          ...(await getDocs(query(colCarpetas, where('eliminada_en', '<', limite)))).docs,
          ...(await getDocs(query(colPresencia, where('visto', '<', new Date(Date.now() - 864e5).toISOString())))).docs,
        ];
        await enLotes(viejas, (b, d) => b.delete(d.ref));
      } catch {
        /* no es grave: se intentará la próxima vez */
      }
    })();
  }, [estado]);

  const notasRef = useRef(notas);
  notasRef.current = notas;

  const acciones = useMemo(() => {
    const reportar = (e: unknown) => setError(mensajeError(e));
    /** Escribe sin esperar al servidor (funciona sin conexión; se envía al volver internet). */
    const enviar = (p: Promise<unknown>) => {
      p.catch(reportar);
    };

    return {
      recargar: async () => {
        setEstado('cargando');
        setIntento((n) => n + 1);
      },

      // ---------- Carpetas ----------
      async crearCarpeta(nombre: string) {
        const ref = doc(colCarpetas);
        enviar(setDoc(ref, { nombre: nombre.trim(), creado_en: ahora(), eliminada_en: null }));
      },
      async renombrarCarpeta(id: string, nombre: string) {
        enviar(updateDoc(doc(colCarpetas, id), { nombre: nombre.trim() }));
      },
      /** Manda la carpeta y sus notas a la papelera (con la misma fecha, para restaurarlas juntas). */
      async eliminarCarpeta(id: string) {
        const fecha = ahora();
        const b = writeBatch(db);
        notasRef.current.filter((n) => n.carpeta_id === id && !n.eliminada_en).forEach((n) => b.update(doc(colNotas, n.id), { eliminada_en: fecha }));
        b.update(doc(colCarpetas, id), { eliminada_en: fecha });
        enviar(b.commit());
      },
      async restaurarCarpeta(carpeta: Carpeta) {
        const b = writeBatch(db);
        b.update(doc(colCarpetas, carpeta.id), { eliminada_en: null });
        notasRef.current
          .filter((n) => n.carpeta_id === carpeta.id && n.eliminada_en && n.eliminada_en === carpeta.eliminada_en)
          .forEach((n) => b.update(doc(colNotas, n.id), { eliminada_en: null }));
        enviar(b.commit());
      },
      async borrarCarpetaDefinitivo(id: string) {
        const b = writeBatch(db);
        notasRef.current.filter((n) => n.carpeta_id === id && n.eliminada_en).forEach((n) => b.delete(doc(colNotas, n.id)));
        notasRef.current.filter((n) => n.carpeta_id === id && !n.eliminada_en).forEach((n) => b.update(doc(colNotas, n.id), { carpeta_id: null }));
        b.delete(doc(colCarpetas, id));
        enviar(b.commit());
      },

      // ---------- Notas ----------
      async crearNota(campos: Partial<CamposNota>, nombre: string) {
        const ref = doc(colNotas);
        const fecha = ahora();
        const datos = {
          titulo: campos.titulo ?? '',
          carpeta_id: campos.carpeta_id ?? null,
          contenido: sanitizar(campos.contenido ?? ''),
          etiquetas: campos.etiquetas ?? [],
          elementos: campos.elementos ?? [],
          autor: nombre,
          editado_por: nombre,
          creado_en: fecha,
          editado_en: fecha,
          version: 1,
          eliminada_en: null,
        };
        enviar(setDoc(ref, datos));
        return normalizar({ id: ref.id, ...datos });
      },

      /** Guarda solo si nadie cambió la nota desde la versión que tenemos (transacción). */
      async guardarNota(id: string, campos: CamposNota, versionBase: number, nombre: string): Promise<ResultadoGuardar> {
        try {
          const ref = doc(colNotas, id);
          return await runTransaction(db, async (tx) => {
            const s = await tx.get(ref);
            if (!s.exists()) throw new Error('La nota ya no existe.');
            const actual = normalizar({ id: s.id, ...s.data() });
            if (actual.version !== versionBase) return { tipo: 'conflicto', actual } as const;
            const cambios = { ...campos, contenido: sanitizar(campos.contenido), editado_por: nombre, editado_en: ahora(), version: versionBase + 1 };
            tx.update(ref, cambios);
            return { tipo: 'ok', nota: { ...actual, ...cambios } } as const;
          });
        } catch (e) {
          return { tipo: 'error', mensaje: mensajeError(e) };
        }
      },

      /** Marcar/desmarcar un elemento desde la tarjeta (sin pisar cambios de otros). */
      async alternarElemento(nota: Nota, elementoId: string, nombre: string) {
        const ref = doc(colNotas, nota.id);
        // Vista inmediata
        setNotas((ns) => ns.map((n) => (n.id === nota.id ? { ...n, elementos: n.elementos.map((e) => (e.id === elementoId ? { ...e, hecho: !e.hecho } : e)) } : n)));
        await runTransaction(db, async (tx) => {
          const s = await tx.get(ref);
          if (!s.exists()) return;
          const actual = normalizar({ id: s.id, ...s.data() });
          const elementos: Elemento[] = actual.elementos.map((e) => (e.id === elementoId ? { ...e, hecho: !e.hecho } : e));
          tx.update(ref, { elementos, editado_por: nombre, editado_en: ahora(), version: actual.version + 1 });
        });
      },

      async moverAPapelera(nota: Nota) {
        enviar(updateDoc(doc(colNotas, nota.id), { eliminada_en: ahora() }));
      },
      async restaurarNota(nota: Nota, carpetaActiva: boolean) {
        enviar(updateDoc(doc(colNotas, nota.id), carpetaActiva ? { eliminada_en: null } : { eliminada_en: null, carpeta_id: null }));
      },
      async borrarNotaDefinitivo(id: string) {
        enviar(deleteDoc(doc(colNotas, id)));
      },
      async vaciarPapelera() {
        const n = notasRef.current.filter((x) => x.eliminada_en).map((x) => doc(colNotas, x.id));
        const c = (await getDocs(query(colCarpetas, where('eliminada_en', '!=', null)))).docs.map((d) => d.ref);
        await enLotes([...n, ...c], (b, ref) => b.delete(ref));
      },
    };
  }, []);

  return { carpetas, notas, estado, error, acciones };
}

export type Acciones = ReturnType<typeof useDatos>['acciones'];
