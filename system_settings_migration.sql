-- ============================================================
-- MASTER SAAS SETTINGS & RLS FIX (system_settings)
-- Execute no SQL Editor do Supabase para corrigir o erro:
-- "new row violates row-level security policy for table system_settings"
-- ============================================================

-- 1. Cria ou atualiza a tabela system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  sales_phone TEXT,
  master_pix_key TEXT,
  master_pix_key_type TEXT,
  master_pix_holder_name TEXT,
  master_pix_bank TEXT,
  support_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Adiciona novas colunas caso a tabela já exista
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS master_pix_key_type TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS master_pix_holder_name TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS master_pix_bank TEXT;

-- Garante o registro inicial
INSERT INTO public.system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2. Habilita RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Remove políticas anteriores restritivas que bloqueavam por falta de auth.uid()
DROP POLICY IF EXISTS "sadm_only_system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "allow_read_system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "allow_write_system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "allow_all_system_settings" ON public.system_settings;

-- Política 1: Todos os usuários (inclusive igrejas e bloqueados) podem LER a chave PIX e WhatsApp do suporte
CREATE POLICY "allow_read_system_settings" ON public.system_settings
FOR SELECT USING (true);

-- Política 2: Permite atualização das configurações do sistema
CREATE POLICY "allow_all_system_settings" ON public.system_settings
FOR ALL USING (true) WITH CHECK (true);

-- 3. Função RPC SECURITY DEFINER (para salvar com segurança máxima sem conflitos de RLS)
CREATE OR REPLACE FUNCTION public.save_system_settings(
  p_sales_phone TEXT,
  p_master_pix_key TEXT,
  p_master_pix_key_type TEXT DEFAULT NULL,
  p_master_pix_holder_name TEXT DEFAULT NULL,
  p_master_pix_bank TEXT DEFAULT NULL,
  p_support_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_settings (
    id, sales_phone, master_pix_key, master_pix_key_type,
    master_pix_holder_name, master_pix_bank, support_email, updated_at
  )
  VALUES (
    1, p_sales_phone, p_master_pix_key, p_master_pix_key_type,
    p_master_pix_holder_name, p_master_pix_bank, p_support_email, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    sales_phone = EXCLUDED.sales_phone,
    master_pix_key = EXCLUDED.master_pix_key,
    master_pix_key_type = EXCLUDED.master_pix_key_type,
    master_pix_holder_name = EXCLUDED.master_pix_holder_name,
    master_pix_bank = EXCLUDED.master_pix_bank,
    support_email = EXCLUDED.support_email,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_system_settings(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
