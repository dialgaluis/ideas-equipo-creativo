import { useEffect, useState } from 'react';

export type Preferencia = 'auto' | 'claro' | 'oscuro';

function leer(): Preferencia {
  try {
    const t = localStorage.getItem('tema');
    return t === 'claro' || t === 'oscuro' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

export function useTema() {
  const [pref, setPref] = useState<Preferencia>(leer);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const aplicar = () => {
      const oscuro = pref === 'oscuro' || (pref === 'auto' && mq.matches);
      document.documentElement.classList.toggle('dark', oscuro);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#0c0a09' : '#7c3aed');
    };
    aplicar();
    try {
      if (pref === 'auto') localStorage.removeItem('tema');
      else localStorage.setItem('tema', pref);
    } catch {
      /* ignorar */
    }
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, [pref]);

  const siguiente = () => setPref((p) => (p === 'auto' ? 'claro' : p === 'claro' ? 'oscuro' : 'auto'));
  return { pref, siguiente };
}
