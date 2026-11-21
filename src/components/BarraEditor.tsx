import { useState, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough, Heading1, Heading2, List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Baseline, Highlighter, Link2, RemoveFormatting,
} from 'lucide-react';

const COLORES_LETRA = ['#1c1917', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#db2777'];
const COLORES_RESALTE = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#ddd6fe'];

function Boton({ activo, titulo, onClick, children, desactivado }: { activo?: boolean; titulo: string; onClick: () => void; children: ReactNode; desactivado?: boolean }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={activo}
      disabled={desactivado}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition disabled:opacity-30 ${
        activo ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/25 dark:text-violet-200' : 'hover:bg-stone-100 dark:hover:bg-stone-800'
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-6 w-px shrink-0 bg-stone-200 dark:bg-stone-700" />;

function Paleta({ colores, onElegir, onQuitar }: { colores: string[]; onElegir: (c: string) => void; onQuitar: () => void }) {
  return (
    <div className="absolute left-0 top-11 z-20 flex flex-wrap gap-1.5 rounded-xl border border-stone-200 bg-white p-2 shadow-lg dark:border-stone-700 dark:bg-stone-900" style={{ width: 176 }}>
      {colores.map((c) => (
        <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onElegir(c)} className="h-7 w-7 rounded-full border border-black/10" style={{ background: c }} aria-label={`Color ${c}`} />
      ))}
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onQuitar} className="mt-1 w-full rounded-lg py-1 text-xs hover:bg-stone-100 dark:hover:bg-stone-800">Quitar color</button>
    </div>
  );
}

export function BarraEditor({ editor }: { editor: Editor }) {
  const [paleta, setPaleta] = useState<'letra' | 'resalte' | null>(null);
  const c = () => editor.chain().focus();

  const ponerEnlace = () => {
    const anterior = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Pega el enlace (deja vacío para quitarlo):', anterior || 'https://');
    if (url === null) return;
    if (url.trim() === '' || url === 'https://') return c().extendMarkRange('link').unsetLink().run();
    const limpio = /^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
    c().extendMarkRange('link').setLink({ href: limpio }).run();
  };

  return (
    <div className="sticky top-0 z-10 -mx-1 flex items-center gap-0.5 overflow-x-auto border-b border-stone-200 bg-white/95 px-1 py-1.5 backdrop-blur dark:border-stone-800 dark:bg-stone-900/95">
      <Boton titulo="Deshacer" onClick={() => c().undo().run()} desactivado={!editor.can().undo()}><Undo2 size={18} /></Boton>
      <Boton titulo="Rehacer" onClick={() => c().redo().run()} desactivado={!editor.can().redo()}><Redo2 size={18} /></Boton>
      <Sep />
      <Boton titulo="Negrita" activo={editor.isActive('bold')} onClick={() => c().toggleBold().run()}><Bold size={18} /></Boton>
      <Boton titulo="Cursiva" activo={editor.isActive('italic')} onClick={() => c().toggleItalic().run()}><Italic size={18} /></Boton>
      <Boton titulo="Subrayado" activo={editor.isActive('underline')} onClick={() => c().toggleUnderline().run()}><Underline size={18} /></Boton>
      <Boton titulo="Tachado" activo={editor.isActive('strike')} onClick={() => c().toggleStrike().run()}><Strikethrough size={18} /></Boton>
      <Sep />
      <Boton titulo="Título grande" activo={editor.isActive('heading', { level: 1 })} onClick={() => c().toggleHeading({ level: 1 }).run()}><Heading1 size={18} /></Boton>
      <Boton titulo="Título mediano" activo={editor.isActive('heading', { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 size={18} /></Boton>
      <Boton titulo="Viñetas" activo={editor.isActive('bulletList')} onClick={() => c().toggleBulletList().run()}><List size={18} /></Boton>
      <Boton titulo="Numeración" activo={editor.isActive('orderedList')} onClick={() => c().toggleOrderedList().run()}><ListOrdered size={18} /></Boton>
      <Boton titulo="Cita" activo={editor.isActive('blockquote')} onClick={() => c().toggleBlockquote().run()}><Quote size={18} /></Boton>
      <Sep />
      <Boton titulo="Alinear a la izquierda" activo={editor.isActive({ textAlign: 'left' })} onClick={() => c().setTextAlign('left').run()}><AlignLeft size={18} /></Boton>
      <Boton titulo="Centrar" activo={editor.isActive({ textAlign: 'center' })} onClick={() => c().setTextAlign('center').run()}><AlignCenter size={18} /></Boton>
      <Boton titulo="Alinear a la derecha" activo={editor.isActive({ textAlign: 'right' })} onClick={() => c().setTextAlign('right').run()}><AlignRight size={18} /></Boton>
      <Boton titulo="Justificar" activo={editor.isActive({ textAlign: 'justify' })} onClick={() => c().setTextAlign('justify').run()}><AlignJustify size={18} /></Boton>
      <Sep />
      <div className="relative">
        <Boton titulo="Color de letra" activo={paleta === 'letra'} onClick={() => setPaleta(paleta === 'letra' ? null : 'letra')}><Baseline size={18} /></Boton>
        {paleta === 'letra' && (
          <Paleta colores={COLORES_LETRA} onElegir={(col) => { c().setColor(col).run(); setPaleta(null); }} onQuitar={() => { c().unsetColor().run(); setPaleta(null); }} />
        )}
      </div>
      <div className="relative">
        <Boton titulo="Resaltado" activo={paleta === 'resalte' || editor.isActive('highlight')} onClick={() => setPaleta(paleta === 'resalte' ? null : 'resalte')}><Highlighter size={18} /></Boton>
        {paleta === 'resalte' && (
          <Paleta colores={COLORES_RESALTE} onElegir={(col) => { c().setHighlight({ color: col }).run(); setPaleta(null); }} onQuitar={() => { c().unsetHighlight().run(); setPaleta(null); }} />
        )}
      </div>
      <Boton titulo="Enlace" activo={editor.isActive('link')} onClick={ponerEnlace}><Link2 size={18} /></Boton>
      <Boton titulo="Limpiar formato" onClick={() => c().unsetAllMarks().clearNodes().run()}><RemoveFormatting size={18} /></Boton>
    </div>
  );
}
