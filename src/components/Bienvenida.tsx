import { useState } from 'react';
import { Lightbulb } from 'lucide-react';

export function Bienvenida({ onListo, inicial = '' }: { onListo: (nombre: string) => void; inicial?: string }) {
  const [nombre, setNombre] = useState(inicial);
  const valido = nombre.trim().length > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-50 p-6 dark:bg-stone-950">
      <form
        className="w-full max-w-sm text-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (valido) onListo(nombre.trim().slice(0, 40));
        }}
      >
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-violet-600 text-white">
          <Lightbulb size={32} />
        </div>
        <h1 className="text-2xl font-bold">Ideas del equipo creativo</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">¿Cómo te llamas? Así el equipo sabrá quién creó o editó cada nota.</p>
        <input
          autoFocus
          className="campo mt-6 text-center text-lg"
          placeholder="Tu nombre"
          value={nombre}
          maxLength={40}
          onChange={(e) => setNombre(e.target.value)}
        />
        <button className="boton mt-4 w-full py-3" disabled={!valido}>Entrar</button>
        <p className="mt-3 text-xs text-stone-500">No hace falta contraseña. Tu nombre se guarda solo en este dispositivo.</p>
      </form>
    </div>
  );
}
