-- ============================================================
-- FUNÇÕES DE DESBLOQUEIO E BAIXA DE PAGAMENTOS (100% NÃO-DESTRUTIVO)
-- Não altera tabelas, não remove colunas e não remove dados existentes.
-- Apenas adiciona 2 funções seguras (SECURITY DEFINER) para o sistema.
-- ============================================================

-- 1. Função segura para dar baixa e liberar a igreja (chamada pelo botão de Baixa)
CREATE OR REPLACE FUNCTION public.confirm_church_payment(p_church_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church RECORD;
  v_months INT := 1;
  v_due_day INT := 10;
  v_grace INT := 5;
  v_today DATE := CURRENT_DATE;
  v_next_due DATE;
  v_promise_date DATE;
BEGIN
  -- Busca os dados atuais da igreja
  SELECT * INTO v_church FROM public.churches WHERE id = p_church_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Igreja não encontrada.');
  END IF;

  -- Determina a quantidade de meses do ciclo do plano
  CASE LOWER(COALESCE(v_church.plan_type, 'mensal'))
    WHEN 'bimestral' THEN v_months := 2;
    WHEN 'trimestral' THEN v_months := 3;
    WHEN 'semestral' THEN v_months := 6;
    WHEN 'anual' THEN v_months := 12;
    ELSE v_months := 1;
  END CASE;

  v_due_day := COALESCE(v_church.due_day, 10);
  v_grace := COALESCE(v_church.grace_period, 5);

  -- Calcula a data do próximo vencimento mantendo o dia de vencimento
  v_next_due := (v_today + (v_months || ' month')::INTERVAL)::DATE;
  BEGIN
    v_next_due := make_date(
      EXTRACT(YEAR FROM v_next_due)::INT,
      EXTRACT(MONTH FROM v_next_due)::INT,
      LEAST(v_due_day, 28)
    );
  EXCEPTION WHEN OTHERS THEN
    v_next_due := (v_today + (v_months || ' month')::INTERVAL)::DATE;
  END;

  -- A liberação cobre até o próximo vencimento somado aos dias de carência
  v_promise_date := v_next_due + (v_grace || ' days')::INTERVAL;

  -- Atualiza diretamente como administrador no banco
  UPDATE public.churches
  SET
    active = true,
    last_payment_date = v_today,
    payment_promise_date = v_promise_date
  WHERE id = p_church_id;

  RETURN jsonb_build_object(
    'success', true,
    'next_due_date', v_next_due::TEXT,
    'payment_promise_date', v_promise_date::TEXT,
    'last_payment_date', v_today::TEXT
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_church_payment(UUID) TO anon, authenticated, service_role;


-- 2. Função segura para ativar/desativar manualmente no botão de Power
CREATE OR REPLACE FUNCTION public.toggle_church_status(p_church_id UUID, p_active BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.churches
  SET
    active = p_active,
    payment_promise_date = CASE 
      WHEN p_active = true THEN (CURRENT_DATE + INTERVAL '30 days')::DATE
      ELSE payment_promise_date 
    END
  WHERE id = p_church_id;

  RETURN jsonb_build_object('success', true, 'active', p_active);
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_church_status(UUID, BOOLEAN) TO anon, authenticated, service_role;
