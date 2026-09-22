-- The party who must accept and pay the invoice (the "Bill To" / "Klienti"
-- name), distinct from vendor_name (who issued the invoice). Stored as a
-- plain column rather than a normalized table for now — no merge/dedupe
-- workflow has been asked for, unlike vendors.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_name TEXT;
