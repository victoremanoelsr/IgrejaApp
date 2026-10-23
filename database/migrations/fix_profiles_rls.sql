-- ==============================================================================
-- DESBLOQUEIO DE VISUALIZAÇÃO DA TABELA PROFILES (USUÁRIOS)
-- 100% SEGURO: NÃO APAGA, NÃO MODIFICA E NÃO DELETA NENHUM DADO OU USUÁRIO
-- ==============================================================================

-- 1. Garante que a leitura de perfis seja permitida para listar os usuários no painel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Remove política antiga restritiva se existir
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public' AND policyname = 'profiles_select_own_church'
    ) THEN
        DROP POLICY "profiles_select_own_church" ON public.profiles;
    END IF;

    -- Cria política de leitura aberta para os usuários cadastrados
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public' AND policyname = 'profiles_allow_read'
    ) THEN
        CREATE POLICY "profiles_allow_read" ON public.profiles FOR SELECT USING (true);
    END IF;
END $$;

-- 2. Cria função RPC segura com SECURITY DEFINER como garantia extra
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS SETOF public.profiles
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE (is_active IS NULL OR is_active = true);
$$;

NOTIFY pgrst, 'reload schema';
