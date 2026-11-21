# Ideas del equipo creativo

App web para que el equipo registre ideas y contenido en un mismo lugar, en tiempo real, desde el celular o la computadora. Sin contraseñas: cada persona solo escribe su nombre la primera vez.

**Incluye:** carpetas, notas con editor tipo Word, listas con casillas, etiquetas de prioridad y plazo, buscador y filtros,
papelera de 30 días, respaldo (exportar/importar), aviso cuando dos personas editan la misma nota, tema claro/oscuro
y se puede instalar en el celular como app.

---

## 1. Correrla en tu computadora

**Necesitas:** [Node.js](https://nodejs.org) (versión LTS) y el proyecto de Supabase creado (ver [GUIA-SUPABASE.md](GUIA-SUPABASE.md)).

1. Abre PowerShell en la carpeta del proyecto (en el Explorador: clic derecho en la carpeta → *Abrir en Terminal*).
2. La primera vez, instala las piezas:
   ```
   npm install
   ```
3. Asegúrate de tener el archivo `.env` con tus claves (ver la guía de Supabase).
4. Enciende la app:
   ```
   npm run dev
   ```
5. Abre en el navegador la dirección que aparece (normalmente **http://localhost:5173**).
6. Para apagarla: en la terminal pulsa `Ctrl + C`.

**Probar desde tu celular en la misma red wifi:** usa `npm run dev -- --host` y abre en el celular la dirección "Network" que aparece (ej. `http://192.168.1.20:5173`).

---

## 2. Publicarla en internet con Vercel

### a) Subir el código a GitHub
1. Crea una cuenta en **https://github.com** si no tienes.
2. Pulsa **New repository**, nómbralo `ideas-equipo-creativo`, elige **Private** y pulsa **Create repository**.
3. En PowerShell, dentro de la carpeta del proyecto, pega los comandos que GitHub te muestra en la sección
   *"…or push an existing repository from the command line"*. Son parecidos a:
   ```
   git remote add origin https://github.com/TU-USUARIO/ideas-equipo-creativo.git
   git branch -M main
   git push -u origin main
   ```
   (El archivo `.env` con tus claves **no** se sube, está protegido.)

### b) Desplegar en Vercel
1. Entra a **https://vercel.com** y regístrate con tu cuenta de GitHub.
2. Pulsa **Add New… → Project**, busca `ideas-equipo-creativo` y pulsa **Import**.
3. Vercel detecta solo que es un proyecto **Vite**. No cambies nada de la configuración de compilación.
4. Abre **Environment Variables** y agrega las dos claves (las mismas de tu `.env`):
   - `VITE_SUPABASE_URL` → tu Project URL
   - `VITE_SUPABASE_ANON_KEY` → tu clave anon
5. Pulsa **Deploy**. En un minuto tendrás un enlace como `https://ideas-equipo-creativo.vercel.app`.

**Actualizar la app más adelante:** cada vez que se suban cambios a GitHub (`git push`), Vercel la vuelve a publicar sola.

---

## 3. Compartirla con el equipo
1. Envía el enlace de Vercel por WhatsApp, Slack o correo **solo a tu equipo** (quien tenga el enlace puede editar).
2. Cada persona escribe su nombre la primera vez.
3. **Instalar en el celular:**
   - **Android (Chrome):** abre el enlace → menú ⋮ → *Instalar app* / *Agregar a la pantalla principal*.
   - **iPhone (Safari):** abre el enlace → botón Compartir → *Agregar a inicio*.

---

## 4. Cuidado de los datos
- **Papelera:** lo eliminado se puede restaurar durante 30 días.
- **Respaldo:** en el menú, *Exportar respaldo* descarga un archivo `.json`. Hazlo cada semana y guárdalo en tu Drive.
- **Importar** suma las notas del archivo a las que ya existen; nunca borra nada.
- **Dos personas en la misma nota:** se ve quién más la tiene abierta. Si ambos guardan a la vez, la app pregunta qué versión
  conservar y guarda la otra como copia: no se pierde texto.

## Datos técnicos (para quien programe)
- Vite + React + TypeScript + Tailwind CSS v4, Tiptap 2, Supabase (Postgres + Realtime), vite-plugin-pwa.
- `supabase/esquema.sql`: tablas `carpetas` y `notas`, RLS anónimo limitado a esas tablas, publicación Realtime.
- Evitar pisarse: columna `version` con actualización condicional (`where version = X`).
- El HTML se limpia con DOMPurify antes de guardar y al pegar (`src/lib/sanitizar.ts`).
- La purga de la papelera (>30 días) se hace al cargar la app.
- Íconos: `npm run iconos` los regenera.
