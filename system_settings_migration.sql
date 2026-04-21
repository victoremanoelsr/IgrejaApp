-- Master SaaS settings (single-row table)
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  sales_phone TEXT,
  master_pix_key TEXT,
  support_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
