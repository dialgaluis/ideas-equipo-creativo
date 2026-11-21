export type Elemento = { id: string; texto: string; hecho: boolean };

export type Carpeta = {
  id: string;
  nombre: string;
  creado_en: string;
  eliminada_en: string | null;
};

export type Nota = {
  id: string;
  titulo: string;
  carpeta_id: string | null;
  contenido: string;
  etiquetas: string[];
  elementos: Elemento[];
  autor: string;
  editado_por: string;
  creado_en: string;
  editado_en: string;
  version: number;
  eliminada_en: string | null;
};

export type CamposNota = Pick<Nota, 'titulo' | 'carpeta_id' | 'contenido' | 'etiquetas' | 'elementos'>;

export type ResultadoGuardar =
  | { tipo: 'ok'; nota: Nota }
  | { tipo: 'conflicto'; actual: Nota }
  | { tipo: 'error'; mensaje: string };

export type Vista = { tipo: 'agenda' } | { tipo: 'todas' } | { tipo: 'carpeta'; id: string } | { tipo: 'papelera' };
