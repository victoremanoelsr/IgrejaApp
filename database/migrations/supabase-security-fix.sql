-- ============================================================
-- CORREÇÃO DE SEGURANÇA — EXECUTAR NO SUPABASE SQL EDITOR
-- ============================================================
-- PROBLEMA 2: Habilitar RLS na tabela letter_history
-- PROBLEMA 3: GRANT explícito para futuras tabelas (precaução)
-- Nenhuma dessas alterações causa perda de dados.
-- ============================================================

-- -------------------------------------------------------
-- PARTE 1: Habilitar RLS na tabela letter_history
-- -------------------------------------------------------

ALTER TABLE letter_history ENABLE ROW LEVEL SECURITY;

-- Política: admins autenticados podem gerenciar cartas da própria igreja
-- Super admins (role = 'SUPER_ADMIN') podem ver tudo
CREATE POLICY "admins_manage_letter_history"
ON letter_history
FOR ALL
TO authenticated
USING (
  church_id = (SELECT church_id FROM users WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  )
)
WITH CHECK (
  church_id = (SELECT church_id FROM users WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  )
);

-- Obs: a chave de serviço (SUPABASE_SERVICE_ROLE_KEY) usada
-- pelo servidor ignora RLS automaticamente — o endpoint
-- /api/member-certificates continua funcionando.

-- -------------------------------------------------------
-- PARTE 2: GRANTs explícitos (preparação para out/2026)
-- -------------------------------------------------------
-- Isso NÃO causa perda de dados. Apenas confirma permissões
-- de API que já existem nas tabelas atuais.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON letter_history TO authenticated;
GRANT INSERT ON letter_history TO authenticated;
GRANT UPDATE ON letter_history TO authenticated;
GRANT DELETE ON letter_history TO authenticated;

-- Para todas as outras tabelas do app (precaução):
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Permite que roles usem sequences (necessário para INSERT com IDs auto-gerados)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================================
-- FIM — Após executar, volte ao Supabase > Authentication >
-- Policies e confirme que letter_history aparece com RLS ativo.
-- ============================================================
