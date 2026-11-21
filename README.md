# Ideas del equipo creativo

App web para que el equipo registre ideas y contenido en un mismo lugar, en tiempo real, desde el celular o la computadora. Sin contraseñas: cada persona solo escribe su nombre la primera vez.

**Incluye:** carpetas, notas con editor tipo Word, listas con casillas, etiquetas de prioridad y plazo, buscador y filtros,
papelera de 30 días, respaldo (exportar/importar), aviso cuando dos personas editan la misma nota, tema claro/oscuro
y se puede instalar en el celular como app.

---

## 1. Correrla en tu computadora

**Necesitas:** [Node.js](https://nodejs.org) (versión LTS) y el proyecto de Firebase creado (ver [GUIA-FIREBASE.md](GUIA-FIREBASE.md)).

1. Abre PowerShell en la carpeta del proyecto (en el Explorador: clic derecho en la carpeta → *Abrir en Terminal*).
2. La primera vez, instala las piezas:
   ```
   npm install
   ```
3. Asegúrate de tener el archivo `.env` con tus claves (ver la guía de Firebase).
4. Enciende la app:
   ```
   npm run dev
   ```
5. Abre en el navegador la dirección que aparece (normalmente **http://localhost:5173**).
6. Para apagarla: en la terminal pulsa `Ctrl + C`.

**Probar desde tu celular en la misma red wifi:** usa `npm run dev -- --host` y abre en el celular la dirección "Network" que aparece (ej. `http://192.168.1.20:5173`).

---

## 2. Publicarla en internet con GitHub Pages

La app se publica sola en GitHub Pages cada vez que se suben cambios (archivo `.github/workflows/publicar.yml`).
El enlace queda así: `https://TU-USUARIO.github.io/ideas-equipo-creativo/`

**Configuración (una sola vez):**
1. El código debe estar en un repositorio de GitHub llamado `ideas-equipo-creativo`. Para GitHub Pages gratis el repositorio debe ser **público**
   (no hay claves secretas en el código; tu `.env` nunca se sube).
2. En GitHub, entra al repositorio → **Settings → Pages** → en *Source* elige **GitHub Actions**.
3. **Settings → Secrets and variables → Actions → pestaña Variables → New repository variable**. Crea estas 4,
   con los mismos valores de tu `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
4. Ve a la pestaña **Actions → Publicar en GitHub Pages → Run workflow**. En 1–2 minutos queda publicada.

**Actualizar la app más adelante:** sube los cambios con `git push`. GitHub la vuelve a publicar sola.

## 3. Compartirla con el equipo
1. Envía el enlace de GitHub Pages por WhatsApp, Slack o correo **solo a tu equipo** (quien tenga el enlace puede editar).
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
- Vite + React + TypeScript + Tailwind CSS v4, Tiptap 2, Firebase Firestore (tiempo real con `onSnapshot`, caché local sin conexión), vite-plugin-pwa.
- `firestore.rules`: acceso anónimo solo a `carpetas`, `notas` y `presencia`, con validación de campos.
- Evitar pisarse: campo `version` comparado dentro de una transacción; "quién está editando" con la colección `presencia`.
- El HTML se limpia con DOMPurify antes de guardar y al pegar (`src/lib/sanitizar.ts`).
- La purga de la papelera (>30 días) se hace al abrir la app.
- Publicación: GitHub Actions → GitHub Pages (`base: './'` en `vite.config.ts`).
- Íconos: `npm run iconos` los regenera.
