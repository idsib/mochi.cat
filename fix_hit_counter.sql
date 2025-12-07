-- Script para arreglar el contador de visitas en Netlify
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Asegurar que la función tiene permisos correctos
DROP FUNCTION IF EXISTS increment_views();

CREATE OR REPLACE FUNCTION increment_views()
RETURNS void
SECURITY DEFINER -- Importante: ejecuta con permisos del owner
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE site_stats
  SET views = views + 1
  WHERE id = 1;
END;
$$;

-- 2. Dar permisos explícitos a usuarios anónimos
GRANT EXECUTE ON FUNCTION increment_views() TO anon;
GRANT EXECUTE ON FUNCTION increment_views() TO authenticated;

-- 3. Verificar que la tabla site_stats existe y tiene datos
INSERT INTO site_stats (id, views) 
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- 4. Asegurar que la política de SELECT permite ver las visitas
DROP POLICY IF EXISTS "Todos pueden ver visitas" ON site_stats;

CREATE POLICY "Todos pueden ver visitas"
  ON site_stats FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Verificar que funciona
SELECT increment_views();
SELECT * FROM site_stats WHERE id = 1;
