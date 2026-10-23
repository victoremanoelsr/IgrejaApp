-- ============================================================
-- INFRAESTRUTURA E INVENTÁRIO FÍSICO - IgrejaApp
-- Execute este SQL no painel SQL do Supabase
-- ============================================================

-- Tabela de Ambientes / Imóveis
CREATE TABLE IF NOT EXISTS physical_spaces (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id    UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('Templo', 'Residência', 'Social', 'Administrativo')),
  area_sqm     NUMERIC,
  capacity     INTEGER,
  details      JSONB DEFAULT '{}',
  image_url    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Itens do Inventário (renomeada para evitar conflito)
CREATE TABLE IF NOT EXISTS inventory_assets (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id     UUID NOT NULL REFERENCES physical_spaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  quantity     INTEGER DEFAULT 1,
  category     TEXT NOT NULL,
  status       TEXT DEFAULT 'Bom' CHECK (status IN ('Bom', 'Manutenção', 'Inativo')),
  image_url    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_physical_spaces_church_id ON physical_spaces(church_id);
CREATE INDEX IF NOT EXISTS idx_inventory_assets_space_id ON inventory_assets(space_id);

-- ============================================================
-- STORAGE: Bucket para fotos dos ambientes e itens
-- Execute via Dashboard Supabase > Storage > New Bucket
-- Nome: assets-photos
-- Public: SIM (para exibir fotos no app)
-- ============================================================
