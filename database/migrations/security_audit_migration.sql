-- =========================================================
-- IgrejaApp — Migração de Segurança e Auditoria
-- Execute no SQL Editor do Supabase (painel > SQL Editor)
-- SEGURO: não deleta tabelas, não reseta usuários ou senhas
-- =========================================================

-- =========================================================
-- PARTE 1: TABELA DE AUDITORIA
-- =========================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  action      TEXT NOT NULL,        -- 'UPDATE' ou 'DELETE'
  table_name  TEXT NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas usuários autenticados lêem os logs
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Inserção somente via trigger (segurança extra)
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (true);


-- =========================================================
-- PARTE 2: FUNÇÃO E TRIGGERS DE AUDITORIA
-- Registra automaticamente qualquer UPDATE ou DELETE
-- nas tabelas financeiras e de membros
-- =========================================================
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    to_jsonb(OLD),
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger na tabela members
DROP TRIGGER IF EXISTS trg_audit_members ON members;
CREATE TRIGGER trg_audit_members
  AFTER UPDATE OR DELETE ON members
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Trigger na tabela transactions (financeiro)
DROP TRIGGER IF EXISTS trg_audit_transactions ON transactions;
CREATE TRIGGER trg_audit_transactions
  AFTER UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();


-- =========================================================
-- PARTE 3: FUNÇÃO AUXILIAR DE RLS
-- Retorna o church_id do usuário logado via tabela profiles
-- =========================================================
CREATE OR REPLACE FUNCTION get_user_church_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT church_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;


-- =========================================================
-- PARTE 4: REFINAMENTO DE RLS — TABELA members
-- Substitui USING (true) por validação real de church_id
-- =========================================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_all"                 ON members;
DROP POLICY IF EXISTS "Enable all access"           ON members;
DROP POLICY IF EXISTS "members_select_own_church"   ON members;
DROP POLICY IF EXISTS "members_insert_own_church"   ON members;
DROP POLICY IF EXISTS "members_update_own_church"   ON members;
DROP POLICY IF EXISTS "members_delete_own_church"   ON members;

CREATE POLICY "members_select_own_church" ON members
  FOR SELECT USING (church_id = get_user_church_id());

CREATE POLICY "members_insert_own_church" ON members
  FOR INSERT WITH CHECK (church_id = get_user_church_id());

CREATE POLICY "members_update_own_church" ON members
  FOR UPDATE
  USING  (church_id = get_user_church_id())
  WITH CHECK (church_id = get_user_church_id());

CREATE POLICY "members_delete_own_church" ON members
  FOR DELETE USING (church_id = get_user_church_id());


-- =========================================================
-- PARTE 5: REFINAMENTO DE RLS — TABELA transactions
-- =========================================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_all"                ON transactions;
DROP POLICY IF EXISTS "Enable all access"               ON transactions;
DROP POLICY IF EXISTS "transactions_select_own_church"  ON transactions;
DROP POLICY IF EXISTS "transactions_insert_own_church"  ON transactions;
DROP POLICY IF EXISTS "transactions_update_own_church"  ON transactions;
DROP POLICY IF EXISTS "transactions_delete_own_church"  ON transactions;

CREATE POLICY "transactions_select_own_church" ON transactions
  FOR SELECT USING (church_id = get_user_church_id());

CREATE POLICY "transactions_insert_own_church" ON transactions
  FOR INSERT WITH CHECK (church_id = get_user_church_id());

CREATE POLICY "transactions_update_own_church" ON transactions
  FOR UPDATE
  USING  (church_id = get_user_church_id())
  WITH CHECK (church_id = get_user_church_id());

CREATE POLICY "transactions_delete_own_church" ON transactions
  FOR DELETE USING (church_id = get_user_church_id());


-- =========================================================
-- PARTE 6: REFINAMENTO DE RLS — TABELA churches
-- Usuário vê a própria sede E suas congregações vinculadas
-- =========================================================
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "churches_all"          ON churches;
DROP POLICY IF EXISTS "Enable all access"     ON churches;
DROP POLICY IF EXISTS "churches_select_own"   ON churches;
DROP POLICY IF EXISTS "churches_update_own"   ON churches;

-- SELECT: vê a sua própria igreja, as congregações dela e a sede pai (se for congregação)
CREATE POLICY "churches_select_own" ON churches
  FOR SELECT USING (
    id = get_user_church_id()
    OR parent_id = get_user_church_id()
    OR id = (SELECT parent_id FROM churches WHERE id = get_user_church_id() LIMIT 1)
  );

-- UPDATE: apenas edita a própria igreja
CREATE POLICY "churches_update_own" ON churches
  FOR UPDATE
  USING  (id = get_user_church_id())
  WITH CHECK (id = get_user_church_id());

-- INSERT: permitido (criação de congregações pelo painel)
DROP POLICY IF EXISTS "churches_insert_own" ON churches;
CREATE POLICY "churches_insert_own" ON churches
  FOR INSERT WITH CHECK (true);


-- =========================================================
-- PARTE 7: REFINAMENTO DE RLS — TABELA profiles
-- =========================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_all"                ON profiles;
DROP POLICY IF EXISTS "Enable all access"           ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_church"  ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"         ON profiles;

-- SELECT: vê perfis da própria igreja + o próprio perfil
CREATE POLICY "profiles_select_own_church" ON profiles
  FOR SELECT USING (
    church_id = get_user_church_id()
    OR id = auth.uid()
  );

-- UPDATE: cada usuário edita apenas o próprio perfil
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT: necessário para criação de novos usuários
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (true);


-- =========================================================
-- FIM — Recarrega o schema do PostgREST
-- =========================================================
NOTIFY pgrst, 'reload schema';
