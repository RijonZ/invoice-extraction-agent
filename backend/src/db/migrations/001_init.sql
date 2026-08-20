CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id),
  invoice_number TEXT,
  invoice_date DATE,
  currency TEXT,
  subtotal NUMERIC(14, 2),
  tax NUMERIC(14, 2),
  total NUMERIC(14, 2),
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'needs_review', 'approved', 'error')),
  validation_errors JSONB NOT NULL DEFAULT '[]',
  file_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  raw_extraction JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(14, 4),
  unit_price NUMERIC(14, 4),
  amount NUMERIC(14, 2)
);

CREATE TABLE IF NOT EXISTS extraction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  extracted_value TEXT,
  corrected_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_line_items_invoice_id ON invoice_line_items(invoice_id);
