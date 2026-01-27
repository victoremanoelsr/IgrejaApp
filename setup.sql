
-- EXECUTE ESTE SCRIPT NO SUPABASE PARA GARANTIR OS TIPOS CORRETOS
DO $$
BEGIN
    -- Transactions Amount
    ALTER TABLE transactions ALTER COLUMN amount TYPE TEXT;
    
    -- Fixed Expenses Amount
    ALTER TABLE fixed_expenses ALTER COLUMN amount TYPE TEXT;
    
    -- Campaigns Goal
    ALTER TABLE campaigns ALTER COLUMN goal TYPE TEXT;
    
    -- Members CPF
    ALTER TABLE members ALTER COLUMN cpf TYPE TEXT;
    
    -- Profiles CPF
    ALTER TABLE profiles ALTER COLUMN cpf TYPE TEXT;

    -- Garante coluna status em transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='status') THEN
        ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'PAGO';
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
