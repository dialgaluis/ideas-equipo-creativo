import { supabase } from './supabase';
import { sanitizar } from './sanitizar';
import type { Carpeta, Nota } from './tipos';

type Respaldo = { app: 'ideas-equipo-creativo'; formato: 1; exportado_en: string; carpetas: Carpeta[]; notas: Nota[] };

export function exportarRespaldo(carpetas: Carpeta[], notas: Nota[]) {
  const datos: Respaldo = { app: 'ideas-equipo-creativo', formato: 1, exportado_en: new Date().toISOString(), carpetas, notas };
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `respaldo-ideas-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Importa un respaldo SUMANDO su contenido (nunca reemplaza ni borra nada). */
export async function importarRespaldo(archivo: File, nombre: string): Promise<{ carpetas: number; notas: number }> {
  let datos: Respaldo;
  try {
    datos = JSON.parse(await archivo.text());
  } catch {
    throw new Error('El archivo no es un respaldo válido.');
  }
  if (datos?.app !== 'ideas-equipo-creativo' || !Array.isArray(datos.notas)) {
    throw new Error('Este archivo no es un respaldo de esta app.');
  }

  // Carpetas nuevas (con ids nuevos) y mapa viejo → nuevo
  const mapa = new Map<string, string>();
  const carpetasActivas = (datos.carpetas ?? []).filter((c) => !c.eliminada_en);
  for (const c of carpetasActivas) {
    const { data, error } = await supabase.from('carpetas').insert({ nombre: String(c.nombre).slice(0, 80) || 'Sin nombre' }).select().single();
    if (error) throw error;
    mapa.set(c.id, (data as Carpeta).id);
  }

  const filas = datos.notas
    .filter((n) => !n.eliminada_en)
    .map((n) => ({
      titulo: String(n.titulo ?? '').slice(0, 300),
      carpeta_id: n.carpeta_id ? mapa.get(n.carpeta_id) ?? null : null,
      contenido: sanitizar(String(n.contenido ?? '')),
      etiquetas: Array.isArray(n.etiquetas) ? n.etiquetas.map(String) : [],
      elementos: Array.isArray(n.elementos)
        ? n.elementos.map((e) => ({ id: crypto.randomUUID(), texto: String(e.texto ?? ''), hecho: Boolean(e.hecho) }))
        : [],
      autor: String(n.autor || nombre),
      editado_por: nombre,
      creado_en: n.creado_en || new Date().toISOString(),
    }));

  for (let i = 0; i < filas.length; i += 100) {
    const { error } = await supabase.from('notas').insert(filas.slice(i, i + 100));
    if (error) throw error;
  }
  return { carpetas: mapa.size, notas: filas.length };
}
