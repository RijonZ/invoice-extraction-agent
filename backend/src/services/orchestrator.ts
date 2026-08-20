import { pool } from "../db/pool.js";
import { extractInvoice } from "./extraction.js";
import { validateInvoice } from "./validation.js";

// The model is instructed to return null for a date it can't find, but
// structured-output schemas only constrain type (string), not format — an
// unparseable value here would otherwise reach the Postgres DATE column and
// fail the whole write. Treat anything that isn't a real calendar date as
// missing rather than crashing the pipeline.
function normalizeDate(value: string | null): { date: string | null; wasInvalid: boolean } {
  if (value === null) return { date: null, wasInvalid: false };
  const isValid = /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
  return isValid ? { date: value, wasInvalid: false } : { date: null, wasInvalid: true };
}

async function findOrCreateVendor(name: string): Promise<string> {
  const normalizedKey = name.trim().toLowerCase();
  const existing = await pool.query("SELECT id FROM vendors WHERE normalized_key = $1", [
    normalizedKey,
  ]);
  if (existing.rows.length > 0) {
    return existing.rows[0].id as string;
  }
  const inserted = await pool.query(
    "INSERT INTO vendors (name, normalized_key) VALUES ($1, $2) RETURNING id",
    [name, normalizedKey]
  );
  return inserted.rows[0].id as string;
}

/**
 * extract -> validate -> (retry lives inside extractInvoice) -> store.
 * Runs after the invoice row and file are already persisted, so a failure
 * here just leaves the invoice in `error` status rather than losing data.
 */
export async function processInvoice(
  invoiceId: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<void> {
  try {
    const { data, missingCriticalFields } = await extractInvoice(fileBuffer, mimeType);
    const validationErrors = validateInvoice(data, missingCriticalFields);
    const { date: invoiceDate, wasInvalid } = normalizeDate(data.invoice_date);
    if (wasInvalid) {
      validationErrors.push(
        `Extracted invoice_date ("${data.invoice_date}") is not a valid ISO date and was dropped.`
      );
    }
    const vendorId = data.vendor_name ? await findOrCreateVendor(data.vendor_name) : null;
    const status = validationErrors.length > 0 ? "needs_review" : "approved";

    await pool.query(
      `UPDATE invoices SET
         vendor_id = $1, invoice_number = $2, invoice_date = $3, currency = $4,
         subtotal = $5, tax = $6, total = $7, status = $8,
         validation_errors = $9, raw_extraction = $10, updated_at = now()
       WHERE id = $11`,
      [
        vendorId,
        data.invoice_number,
        invoiceDate,
        data.currency,
        data.subtotal,
        data.tax,
        data.total,
        status,
        JSON.stringify(validationErrors),
        JSON.stringify(data),
        invoiceId,
      ]
    );

    await pool.query("DELETE FROM invoice_line_items WHERE invoice_id = $1", [invoiceId]);
    for (const [index, item] of data.line_items.entries()) {
      await pool.query(
        `INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, amount, position)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [invoiceId, item.description, item.quantity, item.unit_price, item.amount, index]
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await pool.query(
      `UPDATE invoices SET status = 'error', validation_errors = $1, updated_at = now()
       WHERE id = $2`,
      [JSON.stringify([message]), invoiceId]
    );
  }
}
