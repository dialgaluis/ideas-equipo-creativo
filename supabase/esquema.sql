-- ============================================================
-- Ideas del equipo creativo — esquema de base de datos
-- Pega TODO este archivo en Supabase > SQL Editor y pulsa "Run".
-- Se puede ejecutar más de una vez sin romper nada.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Carpetas ----------
create table if not exists public.carpetas (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null check (char_length(nombre) between 1 and 80),
  creado_en     timestamptz not null default now(),
  eliminada_en  timestamptz            -- si tiene fecha, está en la papelera
);

-- ---------- Notas ----------
create table if not exists public.notas (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null default '' check (char_length(titulo) <= 300),
  carpeta_id    uuid references public.carpetas(id) on delete set null,
  contenido     text not null default '' check (char_length(contenido) <= 500000),
  etiquetas     text[] not null default '{}',
  elementos     jsonb not null default '[]'::jsonb,   -- lista: [{id, texto, hecho}]
  autor         text not null default '',
  editado_por   text not null default '',
  creado_en     timestamptz not null default now(),
  editado_en    timestamptz not null default now(),
  version       integer not null default 1,           -- evita que dos personas se pisen
  eliminada_en  timestamptz
);

create index if not exists notas_carpeta_idx on public.notas (carpeta_id);

-- ---------- Seguridad (Row Level Security) ----------
-- Acceso anónimo (sin login) SOLO a estas dos tablas.
alter table public.carpetas enable row level security;
alter table public.notas    enable row level security;

drop policy if exists "carpetas_publicas" on public.carpetas;
create policy "carpetas_publicas" on public.carpetas
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "notas_publicas" on public.notas;
create policy "notas_publicas" on public.notas
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.carpetas, public.notas to anon, authenticated;

-- ---------- Tiempo real ----------
do $$
begin
  begin
    alter publication supabase_realtime add table public.carpetas;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.notas;
  exception when duplicate_object then null;
  end;
end $$;
