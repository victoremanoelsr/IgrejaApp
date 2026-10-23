-- ============================================================
-- IgrejaApp - Plan Management Migration
-- Run this script once in your Supabase SQL editor
-- ============================================================

-- Add plan management columns to the churches table
ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'isento',
  ADD COLUMN IF NOT EXISTS due_day INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS grace_period INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS payment_promise_date DATE,
  ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- Safety rule: set all existing churches to 'isento' and active = true
-- so no church gets blocked during the update rollout
UPDATE churches
SET
  plan_type = 'isento',
  active = true
WHERE plan_type IS NULL OR plan_type = '';

-- Confirm migration
SELECT id, name, plan_type, due_day, grace_period, active
FROM churches
ORDER BY name;
