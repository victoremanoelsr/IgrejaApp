-- Migrations para adicionar suporte ao sistema de tiers e pagamentos
-- Execute este SQL no editor SQL do painel Supabase

-- Adiciona coluna de tier do plano (bronze, prata, ouro, diamond)
ALTER TABLE churches ADD COLUMN IF NOT EXISTS plan_tier TEXT;

-- Adiciona coluna de data do último pagamento
ALTER TABLE churches ADD COLUMN IF NOT EXISTS last_payment_date DATE;
