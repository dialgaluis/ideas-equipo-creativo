import type { ReactNode } from 'react';

export function Dialogo({ titulo, children, acciones }: { titulo: string; children: ReactNode; acciones: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-stone-900">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <div className="mt-2 text-sm text-stone-600 dark:text-stone-300">{children}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">{acciones}</div>
      </div>
    </div>
  );
}

type ConfirmarProps = {
  titulo: string;
  mensaje: ReactNode;
  textoSi: string;
  peligro?: boolean;
  onSi: () => void;
  onNo: () => void;
};

export function Confirmar({ titulo, mensaje, textoSi, peligro, onSi, onNo }: ConfirmarProps) {
  return (
    <Dialogo
      titulo={titulo}
      acciones={
        <>
          <button className="boton-sec" onClick={onNo}>Cancelar</button>
          <button className={peligro ? 'boton-peligro' : 'boton'} onClick={onSi}>{textoSi}</button>
        </>
      }
    >
      {mensaje}
    </Dialogo>
  );
}
