
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
        layout_json JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );

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

END $$;

NOTIFY pgrst, 'reload schema';
