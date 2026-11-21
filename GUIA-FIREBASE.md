# Guía: crear la base de datos en Firebase (10 minutos)

Firebase (de Google) es donde se guardan las notas en internet. El plan gratuito ("Spark") alcanza de sobra para un equipo.

## 1. Crear el proyecto
1. Entra a **https://console.firebase.google.com** con tu cuenta de Google.
2. Pulsa **Crear un proyecto** (o *Agregar proyecto*).
3. Nombre: `ideas-equipo-creativo`. Pulsa **Continuar**.
4. Google Analytics: **desactívalo** (no hace falta). Pulsa **Crear proyecto** y espera.

## 2. Crear la base de datos (Firestore)
1. En el menú izquierdo: **Compilación → Firestore Database** (o *Bases de datos y almacenamiento → Firestore*).
2. Pulsa **Crear base de datos**.
3. Edición: **Standard**. Ubicación: la más cercana a tu equipo (por ejemplo `southamerica-east1` o `us-central1`). **No se puede cambiar después.**
4. Modo: elige **Iniciar en modo de producción** y pulsa **Crear**.

## 3. Pegar las reglas de seguridad
1. Dentro de Firestore, abre la pestaña **Reglas**.
2. Borra todo lo que aparece.
3. Abre el archivo `firestore.rules` de este proyecto (con el Bloc de notas), copia **todo** y pégalo.
4. Pulsa **Publicar**.

> Estas reglas dejan leer y escribir sin contraseña **solo** en `carpetas`, `notas` y `presencia`, y revisan que los datos tengan la forma correcta. Todo lo demás queda bloqueado.

## 4. Registrar la app web y copiar sus datos
1. Vuelve a la página principal del proyecto (ícono de casa) y pulsa el ícono **`</>`** (Web).
2. Apodo: `ideas-web`. **No** marques Firebase Hosting. Pulsa **Registrar app**.
3. Aparece un bloque de código con `const firebaseConfig = { ... }`. Necesitas 4 datos de ahí:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `appId`

   (Si cierras esa pantalla: engranaje ⚙️ → **Configuración del proyecto** → **General** → baja hasta *Tus apps*.)

## 5. Pegarlos en tu computadora
En la carpeta del proyecto, abre PowerShell y crea el archivo `.env` copiando la plantilla:
```
Copy-Item .env.example .env
```
Ábrelo en el Bloc de notas:
```
notepad .env
```
Reemplaza cada valor (sin comillas):
```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=ideas-equipo-creativo.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ideas-equipo-creativo
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123...
```
Guarda con `Ctrl + S`. El archivo `.env` **no se sube a GitHub** (está protegido en `.gitignore`).

## ¿Es seguro?
Los datos de `firebaseConfig` **no son secretos**: Google los diseñó para ir dentro de la página web. Lo que protege la base
de datos son las reglas del paso 3. Lo que sí debes saber: quien tenga el enlace de la app puede ver y editar las notas.
Compártelo solo con tu equipo.
