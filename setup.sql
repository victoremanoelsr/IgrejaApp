
-- ==============================================================================
-- SCRIPT DE CORREÇÃO E CONFIGURAÇÃO (V8)
-- Este script verifica se as tabelas e políticas existem antes de criar.
-- ==============================================================================

-- 1. GARANTIR EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CORRIGIR TABELA DE IGREJAS (CHURCHES)
CREATE TABLE IF NOT EXISTS churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    cnpj TEXT,
    pastor_name TEXT,
    mission_statement TEXT,
    active BOOLEAN DEFAULT true,
    type TEXT CHECK (type IN ('SEDE', 'CONGREGACAO')),
    parent_id UUID REFERENCES churches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE churches ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE churches DISABLE ROW LEVEL SECURITY;

-- GARANTIR TODAS AS COLUNAS NECESSÁRIAS (EVITA ERRO 400 EM ATUALIZAÇÕES)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='churches' AND column_name='logo_url') THEN
        ALTER TABLE churches ADD COLUMN logo_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='churches' AND column_name='mission_statement') THEN
        ALTER TABLE churches ADD COLUMN mission_statement TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='churches' AND column_name='pastor_name') THEN
        ALTER TABLE churches ADD COLUMN pastor_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='churches' AND column_name='cnpj') THEN
        ALTER TABLE churches ADD COLUMN cnpj TEXT;
    END IF;
END $$;

-- 3. CORRIGIR TABELA DE PERFIS (PROFILES)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT,
    cpf TEXT,
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO')),
    church_id UUID REFERENCES churches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE profiles ALTER COLUMN church_id DROP NOT NULL;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- Garante coluna de senha
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='password') THEN
        ALTER TABLE profiles ADD COLUMN password TEXT;
    END IF;
END $$;

-- 4. ATUALIZAR TABELA DE MEMBROS (FOTO)
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    church_id UUID REFERENCES churches(id), 
    name TEXT,
    cpf TEXT,
    birth_date DATE,
    member_number TEXT,
    is_tither BOOLEAN DEFAULT false,
    baptism_date DATE,
    address JSONB
);
ALTER TABLE members ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE members DISABLE ROW LEVEL SECURITY;

-- ADICIONAR COLUNA DE FOTO SE NÃO EXISTIR
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='photo_url') THEN
        ALTER TABLE members ADD COLUMN photo_url TEXT;
    END IF;
END $$;

-- ADICIONAR COLUNAS DE EMAIL E TELEFONE SE NÃO EXISTIREM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='email') THEN
        ALTER TABLE members ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='phone') THEN
        ALTER TABLE members ADD COLUMN phone TEXT;
    END IF;
END $$;

-- ADICIONAR COLUNA DE ESTADO CIVIL SE NÃO EXISTIR
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='marital_status') THEN
        ALTER TABLE members ADD COLUMN marital_status TEXT;
    END IF;
END $$;

-- 5. OUTRAS TABELAS
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id),
    name TEXT,
    goal NUMERIC,
    start_date DATE,
    description TEXT,
    status TEXT DEFAULT 'ATIVA'
);
ALTER TABLE campaigns ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='status') THEN
        ALTER TABLE campaigns ADD COLUMN status TEXT DEFAULT 'ATIVA';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id),
    type TEXT,
    category TEXT,
    amount NUMERIC,
    date DATE,
    description TEXT,
    member_id UUID,
    responsible_user_id UUID,
    campaign_id UUID,
    attachment_url TEXT
);
ALTER TABLE transactions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- GARANTIR COLUNA CAMPAIGN_ID NA TABELA TRANSACTIONS (PARA SEPARAÇÃO DE CAIXA)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='campaign_id') THEN
        ALTER TABLE transactions ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE;
    END IF;
END $$;

-- CORREÇÃO CRÍTICA PARA PERMITIR EXCLUSÃO DE MEMBROS
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'transactions' AND column_name = 'member_id'
        AND constraint_name != 'transactions_member_id_fkey_setnull'
    )
    LOOP
        EXECUTE 'ALTER TABLE transactions DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_member_id_fkey_setnull'
    ) THEN
        ALTER TABLE transactions 
        ADD CONSTRAINT transactions_member_id_fkey_setnull
        FOREIGN KEY (member_id) 
        REFERENCES members(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- CORREÇÃO CRÍTICA: DEFINIR CASCADE DELETE PARA CAMPANHAS
-- Isso garante que ao deletar uma campanha, as transações sejam deletadas junto.
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Remove qualquer constraint antiga na coluna campaign_id
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'transactions' AND column_name = 'campaign_id'
    )
    LOOP
        EXECUTE 'ALTER TABLE transactions DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;

    -- Adiciona a nova constraint com CASCADE
    ALTER TABLE transactions 
    ADD CONSTRAINT transactions_campaign_id_fkey_cascade
    FOREIGN KEY (campaign_id) 
    REFERENCES campaigns(id) 
    ON DELETE CASCADE;
END $$;

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id),
    name TEXT,
    date DATE,
    time TEXT,
    responsible_name TEXT
);
ALTER TABLE events ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='image_url') THEN
        ALTER TABLE events ADD COLUMN image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='location') THEN
        ALTER TABLE events ADD COLUMN location TEXT;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS minutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id),
    title TEXT,
    date DATE,
    file_url TEXT
);
ALTER TABLE minutes ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE minutes DISABLE ROW LEVEL SECURITY;

-- 6. RECRIAR O SUPER ADMIN (Garante acesso)
INSERT INTO profiles (name, username, password, cpf, role, church_id)
VALUES (
  'Super Administrador',
  'admin',
  'admin', 
  '000.000.000-00', 
  'SUPER_ADM',
  NULL
)
ON CONFLICT (username) DO NOTHING;

-- 7. CONFIGURAÇÃO DO STORAGE
INSERT INTO storage.buckets (id, name, public) VALUES ('member-photos', 'member-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('minutes-files', 'minutes-files', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('transaction-files', 'transaction-files', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('church-logos', 'church-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('event-images', 'event-images', true) ON CONFLICT (id) DO NOTHING;

-- Policies (Simplified for re-run safety)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access Members') THEN
        CREATE POLICY "Public Access Members" ON storage.objects FOR SELECT USING ( bucket_id = 'member-photos' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth Upload Members') THEN
        CREATE POLICY "Auth Upload Members" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'member-photos' );
    END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth Update Members') THEN
        CREATE POLICY "Auth Update Members" ON storage.objects FOR UPDATE WITH CHECK ( bucket_id = 'member-photos' );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access Minutes') THEN
        CREATE POLICY "Public Access Minutes" ON storage.objects FOR SELECT USING ( bucket_id = 'minutes-files' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth Upload Minutes') THEN
        CREATE POLICY "Auth Upload Minutes" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'minutes-files' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth Update Minutes') THEN
        CREATE POLICY "Auth Update Minutes" ON storage.objects FOR UPDATE WITH CHECK ( bucket_id = 'minutes-files' );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access Transactions') THEN
        CREATE POLICY "Public Access Transactions" ON storage.objects FOR SELECT USING ( bucket_id = 'transaction-files' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth Upload Transactions') THEN
        CREATE POLICY "Auth Upload Transactions" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'transaction-files' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth Update Transactions') THEN
        CREATE POLICY "Auth Update Transactions" ON storage.objects FOR UPDATE WITH CHECK ( bucket_id = 'transaction-files' );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access Logos') THEN
        CREATE POLICY "Public Access Logos" ON storage.objects FOR SELECT USING ( bucket_id = 'church-logos' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth Upload Logos') THEN
        CREATE POLICY "Auth Upload Logos" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'church-logos' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth Update Logos') THEN
        CREATE POLICY "Auth Update Logos" ON storage.objects FOR UPDATE WITH CHECK ( bucket_id = 'church-logos' );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access Events') THEN
        CREATE POLICY "Public Access Events" ON storage.objects FOR SELECT USING ( bucket_id = 'event-images' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth Upload Events') THEN
        CREATE POLICY "Auth Upload Events" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'event-images' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth Update Events') THEN
        CREATE POLICY "Auth Update Events" ON storage.objects FOR UPDATE WITH CHECK ( bucket_id = 'event-images' );
    END IF;
END $$;
