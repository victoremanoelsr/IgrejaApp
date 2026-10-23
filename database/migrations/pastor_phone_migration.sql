-- Adiciona coluna pastor_phone para armazenar o WhatsApp do Pastor Presidente.
-- Usado pelo Portal do Membro para envio de pedidos de oração via WhatsApp.
-- Formato sugerido: somente dígitos com DDI (ex.: 5511999999999).

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS pastor_phone TEXT;
