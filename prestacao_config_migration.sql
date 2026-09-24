-- =========================================================================
-- MIGRAÇÃO: Salvar configurações da Prestação de Contas no Supabase por Igreja
-- =========================================================================

-- Adiciona a coluna prestacao_config na tabela churches caso ela ainda não exista
ALTER TABLE churches 
ADD COLUMN IF NOT EXISTS prestacao_config JSONB 
DEFAULT '{"enabled": true, "showDetail": true, "allowPDF": false, "showMonthFilter": true}'::jsonb;

-- Comentário da coluna para documentação
COMMENT ON COLUMN churches.prestacao_config IS 'Configurações de visibilidade da prestação de contas no Portal do Membro (enabled, showDetail, allowPDF, showMonthFilter)';
