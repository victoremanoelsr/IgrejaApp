-- Migrations para adicionar suporte ao sistema de tiers e pagamentos
-- Execute este SQL no editor SQL do painel Supabase

-- Adiciona coluna de tier do plano (bronze, prata, ouro, diamond)
ALTER TABLE churches ADD COLUMN IF NOT EXISTS plan_tier TEXT;

-- Adiciona coluna de data do último pagamento
ALTER TABLE churches ADD COLUMN IF NOT EXISTS last_payment_date DATE;

-- =============================================================
-- PRESTAÇÃO DE CONTAS — Portal do Membro
-- Função pública que bypassa RLS e retorna apenas campos públicos
-- (sem nome de contribuinte, CPF ou dados pessoais)
-- Execute no SQL Editor do Supabase
-- =============================================================
-- Remove TODAS as versões anteriores desta função (qualquer assinatura)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE proname = 'get_public_financial_data'
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig;
  END LOOP;
END $$;

-- Cria função usando SETOF json (sem declaração de tipos — zero conflito)
CREATE FUNCTION get_public_financial_data(
  p_church_id UUID,
  p_month     INT,
  p_year      INT
)
RETURNS SETOF json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id',       t.id::TEXT,
    'date',     t.date::TEXT,
    'category', t.category::TEXT,
    'type',     t.type::TEXT,
    'amount',   t.amount::NUMERIC
  )
  FROM transactions t
  WHERE t.church_id = p_church_id
    AND t.date::DATE >= make_date(p_year, p_month, 1)
    AND t.date::DATE <  make_date(p_year, p_month, 1) + INTERVAL '1 month'
  ORDER BY t.date DESC;
$$;

-- Libera acesso para usuários anônimos (Portal do Membro não usa auth do Supabase)
GRANT EXECUTE ON FUNCTION get_public_financial_data(UUID, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_financial_data(UUID, INT, INT) TO authenticated;

-- =============================================================
-- PIS/PASEP — Tabelas de Funcionários e Períodos de Folha
-- Execute no SQL Editor do Supabase
-- =============================================================

CREATE TABLE IF NOT EXISTS payroll_employees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id    UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  cpf          TEXT DEFAULT '',
  role         TEXT DEFAULT '',
  base_salary  NUMERIC(12,2) DEFAULT 0,
  other_benefits NUMERIC(12,2) DEFAULT 0,
  exempt_benefits NUMERIC(12,2) DEFAULT 0,
  admission_date DATE,
  status       TEXT DEFAULT 'ATIVO',
  dismissal_date DATE,
  observations TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payroll_employees ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payroll_employees' AND policyname = 'Enable all access for payroll_employees'
  ) THEN
    CREATE POLICY "Enable all access for payroll_employees"
      ON payroll_employees FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payroll_periods (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id                UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  competencia              TEXT NOT NULL,
  entries                  JSONB NOT NULL DEFAULT '[]',
  total_employees          INT DEFAULT 0,
  total_payroll            NUMERIC(12,2) DEFAULT 0,
  total_base               NUMERIC(12,2) DEFAULT 0,
  total_pis                NUMERIC(12,2) DEFAULT 0,
  status                   TEXT DEFAULT 'ABERTA',
  financial_transaction_ids JSONB DEFAULT '[]',
  accountant_name          TEXT,
  accountant_crc           TEXT,
  launch_date              DATE,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  closed_at                TIMESTAMPTZ,
  launched_at              TIMESTAMPTZ,
  UNIQUE (church_id, competencia)
);

ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payroll_periods' AND policyname = 'Enable all access for payroll_periods'
  ) THEN
    CREATE POLICY "Enable all access for payroll_periods"
      ON payroll_periods FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
