ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_payment_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_payment_status_check
  CHECK (payment_status IN ('unpaid', 'partial', 'paid'));

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Backfill: existing 'paid' rows had no amount_paid tracking — treat them as
-- fully paid so the outstanding-balance math (total - amount_paid) is correct.
UPDATE invoices SET amount_paid = COALESCE(total, 0) WHERE payment_status = 'paid';
