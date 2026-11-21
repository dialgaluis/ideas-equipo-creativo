import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigurado = Boolean(url && clave && !url.includes('TU-PROYECTO'));

// Solo se usa la clave pública (anon). La clave service_role nunca va en el navegador.
export const supabase = createClient(url || 'http://localhost', clave || 'sin-clave', {
  auth: { persistSession: false },
});

export function mensajeError(e: unknown): string {
  if (!navigator.onLine) return 'Sin conexión a internet.';
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Ocurrió un error inesperado.';
}
