import { doc, writeBatch } from 'firebase/firestore';
import { db, colCarpetas, colNotas } from './firebase';
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

  const ahora = new Date().toISOString();
  const escrituras: [ReturnType<typeof doc>, Record<string, unknown>][] = [];

  // Carpetas nuevas (ids nuevos) y mapa viejo → nuevo
  const mapa = new Map<string, string>();
  for (const c of (datos.carpetas ?? []).filter((c) => !c.eliminada_en)) {
    const ref = doc(colCarpetas);
    mapa.set(c.id, ref.id);
    escrituras.push([ref, { nombre: String(c.nombre).slice(0, 80) || 'Sin nombre', creado_en: ahora, eliminada_en: null }]);
  }

  const notas = datos.notas.filter((n) => !n.eliminada_en);
  for (const n of notas) {
    escrituras.push([
      doc(colNotas),
      {
        titulo: String(n.titulo ?? '').slice(0, 300),
        carpeta_id: n.carpeta_id ? mapa.get(n.carpeta_id) ?? null : null,
        contenido: sanitizar(String(n.contenido ?? '')),
        etiquetas: Array.isArray(n.etiquetas) ? n.etiquetas.map(String) : [],
        elementos: Array.isArray(n.elementos) ? n.elementos.map((e) => ({ id: crypto.randomUUID(), texto: String(e.texto ?? ''), hecho: Boolean(e.hecho) })) : [],
        autor: String(n.autor || nombre),
        editado_por: nombre,
        creado_en: n.creado_en || ahora,
        editado_en: ahora,
        version: 1,
        eliminada_en: null,
      },
    ]);
  }

  for (let i = 0; i < escrituras.length; i += 450) {
    const b = writeBatch(db);
    escrituras.slice(i, i + 450).forEach(([ref, d]) => b.set(ref, d));
    await b.commit();
  }
  return { carpetas: mapa.size, notas: notas.length };
}
