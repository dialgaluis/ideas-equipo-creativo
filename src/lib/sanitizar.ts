import DOMPurify from 'dompurify';

// Solo se conservan estos estilos (color, resaltado y alineación). El resto se borra.
const ESTILOS_PERMITIDOS = ['color', 'background-color', 'text-align'];

DOMPurify.addHook('uponSanitizeAttribute', (_nodo, datos) => {
  if (datos.attrName !== 'style') return;
  const limpio = datos.attrValue
    .split(';')
    .map((s) => s.trim())
    .filter((s) => {
      const prop = s.split(':')[0]?.trim().toLowerCase();
      return ESTILOS_PERMITIDOS.includes(prop) && !/url\(|expression|javascript:/i.test(s);
    })
    .join('; ');
  if (limpio) datos.attrValue = limpio;
  else datos.keepAttr = false;
});

const CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a', 'span', 'mark'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'data-color'],
  ALLOWED_URI_REGEXP: /^(https?:|mailto:|tel:|#)/i,
};

/** Limpia el HTML del editor antes de guardarlo o al pegar desde Word / una web. */
export function sanitizar(html: string): string {
  return DOMPurify.sanitize(html, CONFIG) as string;
}

/** Para pegar: además quita los restos típicos de Word (comentarios condicionales, clases Mso). */
export function limpiarPegado(html: string): string {
  const sinWord = html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<o:p>[\s\S]*?<\/o:p>/gi, '');
  return sanitizar(sinWord);
}

/** Texto plano (para buscador y vista previa de tarjetas). */
export function textoPlano(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = sanitizar(html.replace(/<\/(p|h1|h2|h3|li|blockquote)>/gi, '</$1> '));
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
}
