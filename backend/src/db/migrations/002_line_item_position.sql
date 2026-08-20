-- invoice_line_items previously had no ordering column, so the review
-- dashboard sorted by id (a random UUID) instead of the order the items
-- appeared on the source document.
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
