-- ====================================================================
-- MIGRAÇÃO 100% SEGURA: PUSH NOTIFICATIONS, EVENTOS E NOTIFICAÇÕES FLUTUANTES
-- TOTALMENTE NÃO-DESTRUTIVO (Não remove, não altera e não apaga nenhum dado existente)
-- ====================================================================

DO $$
BEGIN
    -- 1. ADICIONA NOVAS COLUNAS NA TABELA DE EVENTOS (Apenas se ainda não existirem)
    -- Todos os dados e eventos já cadastrados são mantidos intactos!
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'description'
    ) THEN
        ALTER TABLE public.events ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'target_audience'
    ) THEN
        ALTER TABLE public.events ADD COLUMN target_audience TEXT DEFAULT 'TODAS';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'congregation_id'
    ) THEN
        ALTER TABLE public.events ADD COLUMN congregation_id UUID REFERENCES public.churches(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'event_type'
    ) THEN
        ALTER TABLE public.events ADD COLUMN event_type TEXT DEFAULT 'EVENTO';
    END IF;

    -- 2. CRIA A NOVA TABELA DE INSCRIÇÕES DE NOTIFICAÇÃO PUSH (Dispositivos/Celulares)
    CREATE TABLE IF NOT EXISTS public.push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
        congregation_id UUID REFERENCES public.churches(id) ON DELETE SET NULL,
        user_id UUID,
        member_id UUID,
        role TEXT,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        device_type TEXT DEFAULT 'mobile',
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );

    -- 3. CRIA A NOVA TABELA DE NOTIFICAÇÕES DO SISTEMA E DA IGREJA
    CREATE TABLE IF NOT EXISTS public.church_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
        congregation_id UUID REFERENCES public.churches(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'EVENT',
        target_role TEXT DEFAULT 'ALL',
        data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );

    -- 4. HABILITA RLS (Segurança de Linhas)
    ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.church_notifications ENABLE ROW LEVEL SECURITY;

    -- Cria policies sem usar comandos DROP
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'push_subscriptions' AND schemaname = 'public' AND policyname = 'push_subscriptions_all_access'
    ) THEN
        CREATE POLICY "push_subscriptions_all_access" ON public.push_subscriptions FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'church_notifications' AND schemaname = 'public' AND policyname = 'church_notifications_all_access'
    ) THEN
        CREATE POLICY "church_notifications_all_access" ON public.church_notifications FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- 5. HABILITA REALTIME NAS NOTIFICAÇÕES (Para celular receber instantaneamente)
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.church_notifications;
    EXCEPTION
        WHEN duplicate_object THEN
            NULL;
    END;

    -- 6. ÍNDICES DE PERFORMANCE
    CREATE INDEX IF NOT EXISTS idx_push_sub_church ON public.push_subscriptions(church_id);
    CREATE INDEX IF NOT EXISTS idx_push_sub_congregation ON public.push_subscriptions(congregation_id);
    CREATE INDEX IF NOT EXISTS idx_push_sub_role ON public.push_subscriptions(role);
    CREATE INDEX IF NOT EXISTS idx_church_notif_church ON public.church_notifications(church_id);
    CREATE INDEX IF NOT EXISTS idx_church_notif_created ON public.church_notifications(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_church_date ON public.events(church_id, date);

END $$;
