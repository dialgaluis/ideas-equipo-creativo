import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Rutas relativas: funciona igual en tu computadora y en GitHub Pages (tu-usuario.github.io/ideas-equipo-creativo)
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icono.svg'],
      manifest: {
        name: 'Ideas del equipo creativo',
        short_name: 'Ideas',
        description: 'Ideas y contenido compartido del equipo creativo',
        lang: 'es',
        theme_color: '#7c3aed',
        background_color: '#fafaf9',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { navigateFallback: 'index.html' },
    }),
  ],
});
