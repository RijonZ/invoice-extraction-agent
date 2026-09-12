CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

INSERT INTO categories (name) VALUES
  ('Office supplies'),
  ('Software & subscriptions'),
  ('Travel'),
  ('Utilities'),
  ('Professional services'),
  ('Other')
ON CONFLICT (name) DO NOTHING;
