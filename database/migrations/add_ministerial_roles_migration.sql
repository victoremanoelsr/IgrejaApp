-- ====================================================================
-- MIGRAÇÃO: ADIÇÃO DE CARGOS ECLESIÁSTICOS / FUNÇÕES E OBREIROS
-- 100% Segura: Não altera nem apaga nenhum dado existente na tabela!
-- ====================================================================

DO $$
BEGIN
    -- 1. Coluna para o cargo ministerial / função eclesiástica do membro
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'ministerial_role'
    ) THEN
        ALTER TABLE public.members ADD COLUMN ministerial_role TEXT DEFAULT 'MEMBRO';
    END IF;

    -- 2. Coluna booleana indicando se o membro é obreiro (Auxiliar, Diácono, Presbítero, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'is_worker'
    ) THEN
        ALTER TABLE public.members ADD COLUMN is_worker BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Atualiza permissões de acesso da tabela members
GRANT SELECT, INSERT, UPDATE ON public.members TO anon, authenticated;
