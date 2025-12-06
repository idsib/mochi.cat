create table pics (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilitar seguridad a nivel de fila (RLS)
alter table pics enable row level security;

-- 3. Crear políticas para la tabla 'pics'
-- Permitir que todos vean las fotos
create policy "Todos pueden ver las fotos"
  on pics for select
  to anon
  using ( true );

-- Permitir que todos suban fotos (insertar)
create policy "Cualquiera puede subir fotos"
  on pics for insert
  to anon
  with check ( true );

-- 4. Crear el bucket de almacenamiento 'mochi-uploads'
insert into storage.buckets (id, name, public)
values ('mochi-uploads', 'mochi-uploads', true);

-- 5. Crear políticas para el Storage (Almacenamiento)
-- Permitir acceso público para ver archivos
create policy "Todos pueden ver archivos"
  on storage.objects for select
  to anon
  using ( bucket_id = 'mochi-uploads' );

-- Permitir acceso público para subir archivos
create policy "Todos pueden subir archivos"
  on storage.objects for insert
  to anon
  with check ( bucket_id = 'mochi-uploads' );

-- 6. Crear tabla de estadísticas (Hit Counter)
create table site_stats (
  id int primary key default 1,
  views bigint default 0
);

-- Insertar fila inicial
insert into site_stats (id, views) values (1, 0)
on conflict (id) do nothing;

-- Habilitar RLS
alter table site_stats enable row level security;

-- Permitir lectura pública
create policy "Todos pueden ver visitas"
  on site_stats for select
  to anon
  using ( true );

-- Función para incrementar visitas de forma atómica
create or replace function increment_views()
returns void as $$
begin
  update site_stats
  set views = views + 1
  where id = 1;
end;
$$ language plpgsql;

-- Permitir ejecutar la función a anónimos (si es necesario, aunque RPC suele ser público por defecto en configuraciones simples, mejor asegurar)
-- NOTA: En Supabase, las funciones RPC son ejecutables por 'public' por defecto.
