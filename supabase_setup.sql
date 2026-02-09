-- =============================================================================
-- MOCHI.CAT - Supabase Setup
-- =============================================================================

-- 1. Crear tabla 'pics' con bigint IDENTITY (evita fragmentación de índices con UUID aleatorio)
-- Referencia: schema-primary-keys.md - "Random UUIDs (v4) cause index fragmentation"
create table pics (
  id bigint generated always as identity primary key,
  url text not null,
  created_at timestamptz default now() not null
);

-- Índice para queries ordenadas por fecha (común en galerías)
-- Referencia: query-missing-indexes.md - "100-1000x faster queries on large tables"
create index pics_created_at_idx on pics (created_at desc);

-- 2. Habilitar seguridad a nivel de fila (RLS)
alter table pics enable row level security;

-- 3. Crear políticas para la tabla 'pics'
-- Permitir que todos vean las fotos
create policy "Todos pueden ver las fotos"
  on pics for select
  to anon, authenticated
  using ( true );

-- SOLO usuarios autenticados pueden subir fotos
create policy "Solo admins pueden subir fotos"
  on pics for insert
  to authenticated
  with check ( true );

-- SOLO usuarios autenticados pueden eliminar fotos
create policy "Solo admins pueden eliminar fotos"
  on pics for delete
  to authenticated
  using ( true );

-- 4. Crear el bucket de almacenamiento 'mochi-uploads'
insert into storage.buckets (id, name, public)
values ('mochi-uploads', 'mochi-uploads', true);

-- 5. Crear políticas para el Storage (Almacenamiento)
-- Permitir acceso público para ver archivos
create policy "Todos pueden ver archivos"
  on storage.objects for select
  to anon, authenticated
  using ( bucket_id = 'mochi-uploads' );

-- SOLO usuarios autenticados pueden subir archivos
create policy "Solo admins pueden subir archivos"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'mochi-uploads' );

-- SOLO usuarios autenticados pueden eliminar archivos
create policy "Solo admins pueden eliminar archivos"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'mochi-uploads' );

-- 6. Crear tabla de estadísticas (Hit Counter) con IDENTITY
create table site_stats (
  id int generated always as identity primary key,
  views bigint default 0
);

-- Insertar fila inicial (usar OVERRIDING para IDENTITY)
insert into site_stats (views) values (0);

-- Habilitar RLS
alter table site_stats enable row level security;

-- Permitir lectura pública
create policy "Todos pueden ver visitas"
  on site_stats for select
  to anon
  using ( true );

-- Función para incrementar visitas de forma atómica
-- Referencia: security-rls-performance.md - "Use security definer functions"
create or replace function increment_views()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.site_stats
  set views = views + 1
  where id = 1;
end;
$$;

-- Permitir ejecutar la función a anónimos
grant execute on function increment_views() to anon;

-- NOTA: En Supabase, las funciones RPC son ejecutables por 'public' por defecto.
