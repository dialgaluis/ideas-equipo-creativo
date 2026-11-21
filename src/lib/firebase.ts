import { initializeApp } from 'firebase/app';
import { collection, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// Configuración pública de la app web de Firebase (no es secreta: la protegen las reglas de Firestore).
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const firebaseConfigurado = Boolean(config.apiKey && config.projectId && config.appId && !config.apiKey.includes('pega-aqui'));

const app = initializeApp(firebaseConfigurado ? config : { apiKey: 'sin-configurar', projectId: 'sin-configurar', appId: 'sin-configurar' });

// Caché local: las notas se pueden ver aunque no haya internet.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const colCarpetas = collection(db, 'carpetas');
export const colNotas = collection(db, 'notas');
export const colPresencia = collection(db, 'presencia');

export function mensajeError(e: unknown): string {
  if (!navigator.onLine) return 'Sin conexión a internet.';
  const codigo = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
  if (codigo.includes('permission-denied')) return 'Firebase rechazó el cambio. Revisa que pegaste las reglas de seguridad (GUIA-FIREBASE.md).';
  if (codigo.includes('unavailable')) return 'No se pudo conectar con Firebase. Se reintentará.';
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Ocurrió un error inesperado.';
}
