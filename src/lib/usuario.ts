const CLAVE = 'nombre-usuario';

export function leerNombre(): string {
  try {
    return localStorage.getItem(CLAVE) || '';
  } catch {
    return '';
  }
}

export function guardarNombre(nombre: string) {
  try {
    localStorage.setItem(CLAVE, nombre.trim());
  } catch {
    /* sin almacenamiento: se pedirá de nuevo */
  }
}

export const nuevoId = () => crypto.randomUUID();
