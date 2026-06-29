
-- SCRIPT DE CORREÇÃO DE PERMISSÕES (UPLOAD)
-- Execute este script no SQL Editor do Supabase

DO $$
BEGIN
    -- 1. GARANTIR QUE OS BUCKETS EXISTAM
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('images', 'images', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO storage.buckets (id, name, public)
    VALUES ('documents', 'documents', true)
    ON CONFLICT (id) DO NOTHING;

    -- 2. CORREÇÃO DAS POLICIES DE STORAGE
    
    -- IMAGES: INSERT (Permitir Upload)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Insert Images'
    ) THEN
        CREATE POLICY "Public Insert Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');
    END IF;

    -- IMAGES: SELECT (Visualização)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Access Images'
    ) THEN
        CREATE POLICY "Public Access Images" ON storage.objects FOR SELECT USING (bucket_id = 'images');
    END IF;

    -- DOCUMENTS: INSERT (Permitir Upload)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Insert Documents'
    ) THEN
        CREATE POLICY "Public Insert Documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
    END IF;

    -- DOCUMENTS: SELECT (Visualização)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Access Documents'
    ) THEN
        CREATE POLICY "Public Access Documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
    END IF;

    -- 3. GARANTIR ESTRUTURA DAS TABELAS (Prevenção)
    CREATE TABLE IF NOT EXISTS mission_carnet_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        background_url TEXT,
        layout_json JSONB,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );

    -- ATUALIZAÇÃO SEGURA: Adicionar coluna de estilo de fundo se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mission_carnet_templates' AND column_name='background_style') THEN
        ALTER TABLE mission_carnet_templates ADD COLUMN background_style JSONB DEFAULT '{"mode": "cover", "opacity": 0.5}'::jsonb;
    END IF;

    ALTER TABLE mission_carnet_templates ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'mission_carnet_templates' AND policyname = 'Enable all access for templates'
    ) THEN
        CREATE POLICY "Enable all access for templates" ON mission_carnet_templates FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- NOVO: Tabela para Modelos de Cartas (Papel Timbrado)
    CREATE TABLE IF NOT EXISTS letter_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- RECOMENDACAO, MUDANCA, GENERICO
        background_url TEXT,
        recommendation_text TEXT,
        change_text TEXT,
        layout_json JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );

    -- Garantir que colunas novas existam se a tabela já existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='letter_templates' AND column_name='recommendation_text') THEN
        ALTER TABLE letter_templates ADD COLUMN recommendation_text TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='letter_templates' AND column_name='change_text') THEN
        ALTER TABLE letter_templates ADD COLUMN change_text TEXT;
    END IF;

    ALTER TABLE letter_templates ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'letter_templates' AND policyname = 'Enable all access for letter templates'
    ) THEN
        CREATE POLICY "Enable all access for letter templates" ON letter_templates FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Colunas auxiliares
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='is_youth') THEN
        ALTER TABLE members ADD COLUMN is_youth BOOLEAN DEFAULT false; 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='is_child') THEN
        ALTER TABLE members ADD COLUMN is_child BOOLEAN DEFAULT false; 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='is_lady') THEN
        ALTER TABLE members ADD COLUMN is_lady BOOLEAN DEFAULT false; 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='status') THEN
        ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'PAGO';
    END IF;

    -- Portal do Membro: senha personalizada do membro
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='member_password') THEN
        ALTER TABLE members ADD COLUMN member_password TEXT;
    END IF;

    -- Portal do Membro: chave PIX da igreja
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='churches' AND column_name='pix_key') THEN
        ALTER TABLE churches ADD COLUMN pix_key TEXT;
    END IF;

END $;

-- Habilitar Realtime para a tabela members (foto e dados sincronizam em tempo real)
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE members;
    END IF;
END $;

-- ================================================================
-- Portal do Membro: Ofertas de Campanhas cadastradas no nome do membro
-- Função com SECURITY DEFINER para bypassar RLS (membro usa chave anon)
-- ================================================================
CREATE OR REPLACE FUNCTION get_member_campaign_contributions(
  p_church_id UUID,
  p_member_name TEXT
)
RETURNS SETOF json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $
  SELECT json_build_object(
    'id',           t.id::TEXT,
    'church_id',    t.church_id::TEXT,
    'campaign_id',  t.campaign_id::TEXT,
    'type',         t.type,
    'category',     t.category,
    'amount',       t.amount,
    'date',         t.date::TEXT,
    'description',  t.description,
    'status',       COALESCE(t.status, 'PAGO'),
    'member_id',    NULL,
    'responsible_user_id', NULL
  )
  FROM transactions t
  WHERE t.church_id = p_church_id
    AND t.campaign_id IS NOT NULL
    AND t.type = 'ENTRADA'
    AND t.description = ('DOAÇÃO: ' || UPPER(p_member_name))
  ORDER BY t.date DESC;
$;

GRANT EXECUTE ON FUNCTION get_member_campaign_contributions(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_member_campaign_contributions(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
