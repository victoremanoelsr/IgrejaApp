-- ================================================================
-- CORREÇÃO: Exclusão de congregações com cascade completo
-- 
-- O problema: as políticas RLS do Supabase bloqueiam DELETEs
-- de tabelas filhas quando o admin da sede tenta excluir uma
-- congregação (church_id da congregação ≠ church_id do admin).
-- Isso deixa registros órfãos que causam violação de FK (HTTP 409)
-- ao tentar excluir a linha da congregação.
--
-- Solução: função SECURITY DEFINER que bypassa RLS e faz toda
-- a limpeza em cascata internamente antes de excluir a igreja.
--
-- Execute este SQL no editor SQL do painel Supabase.
-- ================================================================

CREATE OR REPLACE FUNCTION delete_church_cascade(p_church_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Registros financeiros e de membros
  DELETE FROM transactions          WHERE church_id = p_church_id;
  DELETE FROM members               WHERE church_id = p_church_id;
  DELETE FROM events                WHERE church_id = p_church_id;
  DELETE FROM campaigns             WHERE church_id = p_church_id;
  DELETE FROM minutes               WHERE church_id = p_church_id;
  DELETE FROM fixed_expenses        WHERE church_id = p_church_id;
  DELETE FROM letter_history        WHERE church_id = p_church_id;

  -- 2. Configurações e templates
  DELETE FROM booklet_settings          WHERE church_id = p_church_id;
  DELETE FROM mission_carnet_templates  WHERE church_id = p_church_id;
  DELETE FROM letter_templates          WHERE church_id = p_church_id;

  -- 3. Infraestrutura (inventory_assets cascateia automaticamente via physical_spaces)
  DELETE FROM physical_spaces WHERE church_id = p_church_id;

  -- 4. Folha de pagamento / PIS-PASEP
  DELETE FROM payroll_employees WHERE church_id = p_church_id;
  DELETE FROM payroll_periods   WHERE church_id = p_church_id;

  -- 5. Usuários vinculados
  DELETE FROM profiles WHERE church_id = p_church_id;

  -- 6. Finalmente, excluir a própria igreja
  DELETE FROM churches WHERE id = p_church_id;
END;
$$;

-- Permissão de execução para usuários autenticados (admin da sede)
GRANT EXECUTE ON FUNCTION delete_church_cascade(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
