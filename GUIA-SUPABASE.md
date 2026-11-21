# Guía: crear la base de datos en Supabase (10 minutos)

Supabase es el lugar donde se guardan las notas en internet. Es gratis para un equipo pequeño.

## 1. Crear la cuenta y el proyecto
1. Entra a **https://supabase.com** y pulsa **Start your project**. Puedes entrar con tu cuenta de GitHub.
2. Pulsa **New project**.
3. Llena los datos:
   - **Name:** `ideas-equipo-creativo`
   - **Database Password:** pulsa *Generate a password* y guárdala en un lugar seguro (la app **no** la necesita).
   - **Region:** la más cercana a tu equipo (por ejemplo *South America (São Paulo)* o *East US*).
4. Pulsa **Create new project** y espera 1–2 minutos a que termine.

## 2. Crear las tablas
1. En el menú izquierdo, entra a **SQL Editor**.
2. Pulsa **New query**.
3. Abre el archivo `supabase/esquema.sql` de este proyecto (con el Bloc de notas sirve), copia **todo** y pégalo.
4. Pulsa **Run** (abajo a la derecha). Debe decir *Success. No rows returned*.
   - Si te pregunta algo sobre "destructive operation", pulsa **Run this query** — es normal, solo reemplaza los permisos si ya existían.
5. Comprueba: en **Table Editor** deberías ver las tablas `carpetas` y `notas`.

## 3. Copiar las claves
1. Ve a **Project Settings** (ícono de engranaje) → **API** (o **Data API** / **API Keys**).
2. Copia dos datos:
   - **Project URL** — se ve así: `https://abcdefgh.supabase.co`
   - La clave **anon public** (o **publishable**) — un texto largo.

> ⚠️ **Nunca** copies la clave **service_role** (o **secret**). Esa da control total y no debe estar en la app.

## 4. Pegar las claves en tu computadora
1. En la carpeta del proyecto, copia el archivo `.env.example` y renombra la copia a **`.env`** (sin nada antes del punto).
2. Ábrelo con el Bloc de notas y reemplaza:
   ```
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_ANON_KEY=la-clave-anon-que-copiaste
   ```
3. Guarda. El archivo `.env` **no se sube a Git** (ya está protegido en `.gitignore`).

## ¿Es seguro usar la clave pública?
Sí. La clave "anon" está hecha para ir en el navegador. Las reglas (Row Level Security) del archivo `esquema.sql`
solo permiten leer y escribir en las tablas `carpetas` y `notas`, nada más del proyecto.
Lo que **sí** debes saber: cualquiera con el enlace de la app puede ver y editar las notas. Compártelo solo con tu equipo.
