
-- EXECUTE ESTE SCRIPT NO EDITOR SQL DO SUPABASE PARA ATUALIZAR O BANCO

DO $$
BEGIN
    -- 1. Adicionar coluna 'status' na tabela 'transactions' se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='status') THEN
        ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'PAGO';
    END IF;

    -- 2. Criar tabela 'fixed_expenses' se não existir
    CREATE TABLE IF NOT EXISTS fixed_expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        church_id UUID REFERENCES churches(id),
        description TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
        category TEXT NOT NULL,
        auto_generate BOOLEAN DEFAULT false,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );

    -- Habilita segurança RLS
    ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

    -- 3. Criar Policy de Segurança apenas se não existir (evita erro e evita warning de DROP)
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'fixed_expenses' 
        AND policyname = 'Enable all access for all users'
    ) THEN
        CREATE POLICY "Enable all access for all users" ON fixed_expenses FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Notifica recarregamento do schema
NOTIFY pgrst, 'reload schema';
