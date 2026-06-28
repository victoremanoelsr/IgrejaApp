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
CREATE OR REPLACE FUNCTION get_public_financial_data(
  p_church_id UUID,
  p_month     INT,
  p_year      INT
)
RETURNS TABLE (
  id       UUID,
  date     DATE,
  category TEXT,
  type     TEXT,
  amount   NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start DATE;
  v_end   DATE;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end   := (v_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  RETURN QUERY
    SELECT
      t.id,
      t.date,
      t.category::TEXT,
      t.type::TEXT,
      t.amount
    FROM transactions t
    WHERE t.church_id = p_church_id
      AND t.date BETWEEN v_start AND v_end
    ORDER BY t.date DESC;
END;
$$;

-- Permite que qualquer usuário (incluindo anônimo) execute esta função
GRANT EXECUTE ON FUNCTION get_public_financial_data(UUID, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_financial_data(UUID, INT, INT) TO authenticated;
