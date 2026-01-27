
-- EXECUTE ESTE SCRIPT PARA PERMITIR CRIPTOGRAFIA NOS VALORES
DO $$
BEGIN
    -- Alterar colunas de valor para TEXT para suportar strings criptografadas
    ALTER TABLE transactions ALTER COLUMN amount TYPE TEXT;
    ALTER TABLE fixed_expenses ALTER COLUMN amount TYPE TEXT;
    ALTER TABLE campaigns ALTER COLUMN goal TYPE TEXT;

    -- Garantir que a coluna status existe (caso não tenha rodado antes)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='status') THEN
        ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'PAGO';
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
