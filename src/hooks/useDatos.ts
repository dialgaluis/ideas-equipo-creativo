import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, mensajeError } from '../lib/supabase';
import { sanitizar } from '../lib/sanitizar';
import type { CamposNota, Carpeta, Elemento, Nota, ResultadoGuardar } from '../lib/tipos';

const DIAS_PAPELERA = 30;
const ahora = () => new Date().toISOString();

function normalizar(n: Nota): Nota {
  return { ...n, etiquetas: n.etiquetas ?? [], elementos: Array.isArray(n.elementos) ? n.elementos : [] };
}

/** Inserta o reemplaza una fila, sin retroceder a una versión más vieja. */
function fusionar<T extends { id: string; version?: number }>(lista: T[], fila: T): T[] {
  const i = lista.findIndex((x) => x.id === fila.id);
  if (i === -1) return [...lista, fila];
  if ((lista[i].version ?? 0) > (fila.version ?? 0)) return lista;
  const copia = lista.slice();
  copia[i] = fila;
  return copia;
}

export function useDatos() {
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      // Borra de verdad lo que lleva más de 30 días en la papelera
      const limite = new Date(Date.now() - DIAS_PAPELERA * 864e5).toISOString();
      await supabase.from('notas').delete().lt('eliminada_en', limite);
      await supabase.from('carpetas').delete().lt('eliminada_en', limite);

      const [c, n] = await Promise.all([
        supabase.from('carpetas').select('*').order('nombre'),
        supabase.from('notas').select('*'),
      ]);
      if (c.error) throw c.error;
      if (n.error) throw n.error;
      setCarpetas(c.data as Carpeta[]);
      setNotas((n.data as Nota[]).map(normalizar));
      setEstado('listo');
      setError('');
    } catch (e) {
      setError(mensajeError(e));
      setEstado((s) => (s === 'listo' ? 'listo' : 'error'));
    }
  }, []);

  // Carga inicial + tiempo real
  useEffect(() => {
    cargar();
    const canal = supabase
      .channel('cambios-app')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notas' }, (p) => {
        if (p.eventType === 'DELETE') setNotas((ns) => ns.filter((x) => x.id !== (p.old as { id: string }).id));
        else setNotas((ns) => fusionar(ns, normalizar(p.new as Nota)));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carpetas' }, (p) => {
        if (p.eventType === 'DELETE') setCarpetas((cs) => cs.filter((x) => x.id !== (p.old as { id: string }).id));
        else setCarpetas((cs) => fusionar(cs, p.new as Carpeta));
      })
      .subscribe();
    const alVolver = () => cargar();
    window.addEventListener('online', alVolver);
    return () => {
      supabase.removeChannel(canal);
      window.removeEventListener('online', alVolver);
    };
  }, [cargar]);

  const acciones = useMemo(() => {
    const ponerNota = (n: Nota) => setNotas((ns) => fusionar(ns, normalizar(n)));
    const ponerCarpeta = (c: Carpeta) => setCarpetas((cs) => fusionar(cs, c));

    return {
      recargar: cargar,

      // ---------- Carpetas ----------
      async crearCarpeta(nombre: string) {
        const { data, error } = await supabase.from('carpetas').insert({ nombre: nombre.trim() }).select().single();
        if (error) throw error;
        ponerCarpeta(data as Carpeta);
        return data as Carpeta;
      },
      async renombrarCarpeta(id: string, nombre: string) {
        const { data, error } = await supabase.from('carpetas').update({ nombre: nombre.trim() }).eq('id', id).select().single();
        if (error) throw error;
        ponerCarpeta(data as Carpeta);
      },
      /** Manda la carpeta y sus notas a la papelera (con la misma fecha, para restaurarlas juntas). */
      async eliminarCarpeta(id: string) {
        const fecha = ahora();
        const n = await supabase.from('notas').update({ eliminada_en: fecha }).eq('carpeta_id', id).is('eliminada_en', null).select();
        if (n.error) throw n.error;
        (n.data as Nota[]).forEach(ponerNota);
        const c = await supabase.from('carpetas').update({ eliminada_en: fecha }).eq('id', id).select().single();
        if (c.error) throw c.error;
        ponerCarpeta(c.data as Carpeta);
      },
      async restaurarCarpeta(carpeta: Carpeta) {
        const c = await supabase.from('carpetas').update({ eliminada_en: null }).eq('id', carpeta.id).select().single();
        if (c.error) throw c.error;
        ponerCarpeta(c.data as Carpeta);
        if (carpeta.eliminada_en) {
          const n = await supabase.from('notas').update({ eliminada_en: null }).eq('carpeta_id', carpeta.id).eq('eliminada_en', carpeta.eliminada_en).select();
          if (n.error) throw n.error;
          (n.data as Nota[]).forEach(ponerNota);
        }
      },
      async borrarCarpetaDefinitivo(id: string) {
        const n = await supabase.from('notas').delete().eq('carpeta_id', id).not('eliminada_en', 'is', null);
        if (n.error) throw n.error;
        const { error } = await supabase.from('carpetas').delete().eq('id', id);
        if (error) throw error;
        setNotas((ns) => ns.filter((x) => !(x.carpeta_id === id && x.eliminada_en)));
        setCarpetas((cs) => cs.filter((x) => x.id !== id));
      },

      // ---------- Notas ----------
      async crearNota(campos: Partial<CamposNota>, nombre: string) {
        const fila = {
          titulo: campos.titulo ?? '',
          carpeta_id: campos.carpeta_id ?? null,
          contenido: sanitizar(campos.contenido ?? ''),
          etiquetas: campos.etiquetas ?? [],
          elementos: campos.elementos ?? [],
          autor: nombre,
          editado_por: nombre,
        };
        const { data, error } = await supabase.from('notas').insert(fila).select().single();
        if (error) throw error;
        ponerNota(data as Nota);
        return normalizar(data as Nota);
      },

      /** Guarda solo si nadie cambió la nota desde la versión que tenemos. */
      async guardarNota(id: string, campos: CamposNota, versionBase: number, nombre: string): Promise<ResultadoGuardar> {
        try {
          const { data, error } = await supabase
            .from('notas')
            .update({ ...campos, contenido: sanitizar(campos.contenido), editado_por: nombre, editado_en: ahora(), version: versionBase + 1 })
            .eq('id', id)
            .eq('version', versionBase)
            .select();
          if (error) throw error;
          if (!data.length) {
            const act = await supabase.from('notas').select('*').eq('id', id).single();
            if (act.error) throw act.error;
            return { tipo: 'conflicto', actual: normalizar(act.data as Nota) };
          }
          ponerNota(data[0] as Nota);
          return { tipo: 'ok', nota: normalizar(data[0] as Nota) };
        } catch (e) {
          return { tipo: 'error', mensaje: mensajeError(e) };
        }
      },

      /** Marcar/desmarcar un elemento desde la tarjeta (reintenta si otra persona cambió la nota). */
      async alternarElemento(nota: Nota, elementoId: string, nombre: string) {
        let base = nota;
        for (let intento = 0; intento < 3; intento++) {
          const elementos: Elemento[] = base.elementos.map((e) => (e.id === elementoId ? { ...e, hecho: !e.hecho } : e));
          ponerNota({ ...base, elementos, version: base.version }); // vista inmediata
          const { data, error } = await supabase
            .from('notas')
            .update({ elementos, editado_por: nombre, editado_en: ahora(), version: base.version + 1 })
            .eq('id', base.id)
            .eq('version', base.version)
            .select();
          if (error) throw error;
          if (data.length) return ponerNota(data[0] as Nota);
          const act = await supabase.from('notas').select('*').eq('id', base.id).single();
          if (act.error) throw act.error;
          base = normalizar(act.data as Nota);
          setNotas((ns) => ns.map((x) => (x.id === base.id ? base : x)));
        }
      },

      async moverAPapelera(nota: Nota) {
        const { data, error } = await supabase.from('notas').update({ eliminada_en: ahora() }).eq('id', nota.id).select().single();
        if (error) throw error;
        ponerNota(data as Nota);
      },
      async restaurarNota(nota: Nota, carpetaActiva: boolean) {
        const cambios: Record<string, unknown> = { eliminada_en: null };
        if (!carpetaActiva) cambios.carpeta_id = null; // su carpeta sigue en la papelera
        const { data, error } = await supabase.from('notas').update(cambios).eq('id', nota.id).select().single();
        if (error) throw error;
        ponerNota(data as Nota);
      },
      async borrarNotaDefinitivo(id: string) {
        const { error } = await supabase.from('notas').delete().eq('id', id);
        if (error) throw error;
        setNotas((ns) => ns.filter((x) => x.id !== id));
      },
      async vaciarPapelera() {
        const n = await supabase.from('notas').delete().not('eliminada_en', 'is', null);
        if (n.error) throw n.error;
        const c = await supabase.from('carpetas').delete().not('eliminada_en', 'is', null);
        if (c.error) throw c.error;
        setNotas((ns) => ns.filter((x) => !x.eliminada_en));
        setCarpetas((cs) => cs.filter((x) => !x.eliminada_en));
      },
    };
  }, [cargar]);

  return { carpetas, notas, estado, error, acciones };
}

export type Acciones = ReturnType<typeof useDatos>['acciones'];
