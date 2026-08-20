import { Router } from "express";
import { pool } from "../db/pool.js";
import { getInvoiceFileUrl } from "../services/storage.js";

export const invoicesRouter = Router();

const VALID_STATUSES = new Set(["processing", "needs_review", "approved", "error"]);

invoicesRouter.get("/invoices", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (status && VALID_STATUSES.has(status)) {
    params.push(status);
    conditions.push(`i.status = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT i.*, v.name AS vendor_name FROM invoices i
     LEFT JOIN vendors v ON v.id = i.vendor_id
     ${where} ORDER BY i.created_at DESC`,
    params
  );

  res.json(result.rows);
});

invoicesRouter.get("/invoices/:id", async (req, res) => {
  const invoiceResult = await pool.query(
    `SELECT i.*, v.name AS vendor_name FROM invoices i
     LEFT JOIN vendors v ON v.id = i.vendor_id
     WHERE i.id = $1`,
    [req.params.id]
  );
  const invoice = invoiceResult.rows[0];
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const lineItems = await pool.query(
    "SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY position",
    [req.params.id]
  );
  const fileUrl = await getInvoiceFileUrl(invoice.file_key);

  res.json({ ...invoice, line_items: lineItems.rows, file_url: fileUrl });
});

interface CorrectionBody {
  corrections: Record<string, string | number | null>;
}

// Applies user-supplied field corrections, records each change in
// extraction_feedback for future prompt/eval improvement, and approves.
invoicesRouter.patch("/invoices/:id/correct", async (req, res) => {
  const body = req.body as CorrectionBody;
  if (!body?.corrections || typeof body.corrections !== "object") {
    res.status(400).json({ error: "Expected { corrections: { field: value } }" });
    return;
  }

  const current = await pool.query("SELECT * FROM invoices WHERE id = $1", [req.params.id]);
  const invoice = current.rows[0];
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const allowedFields = new Set([
    "invoice_number",
    "invoice_date",
    "currency",
    "subtotal",
    "tax",
    "total",
  ]);

  const setClauses: string[] = [];
  const values: unknown[] = [];
  const correctedFields: string[] = [];

  for (const [field, newValue] of Object.entries(body.corrections)) {
    if (!allowedFields.has(field)) continue;

    await pool.query(
      `INSERT INTO extraction_feedback (invoice_id, field_name, extracted_value, corrected_value)
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, field, invoice[field] === null ? null : String(invoice[field]), String(newValue)]
    );

    values.push(newValue);
    setClauses.push(`${field} = $${values.length}`);
    correctedFields.push(field);
  }

  if (setClauses.length === 0) {
    res.status(400).json({ error: "No recognized correctable fields in request" });
    return;
  }

  values.push(req.params.id);
  await pool.query(
    `UPDATE invoices SET ${setClauses.join(", ")}, status = 'approved', updated_at = now()
     WHERE id = $${values.length}`,
    values
  );

  const updated = await pool.query("SELECT * FROM invoices WHERE id = $1", [req.params.id]);
  res.json(updated.rows[0]);
});
