import { Router } from "express";
import { pool } from "../db/pool.js";
import { logAudit } from "../services/audit.js";
import { getInvoiceFileUrl } from "../services/storage.js";

export const invoicesRouter = Router();

const VALID_STATUSES = new Set(["processing", "needs_review", "approved", "error"]);
const VALID_PAYMENT_STATUSES = new Set(["paid", "unpaid", "partial"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const SELECT_INVOICE = `
  SELECT i.*, v.name AS vendor_name, c.name AS category_name
  FROM invoices i
  LEFT JOIN vendors v ON v.id = i.vendor_id
  LEFT JOIN categories c ON c.id = i.category_id
`;

const CSV_COLUMNS = [
  "vendor_name",
  "invoice_number",
  "invoice_date",
  "currency",
  "subtotal",
  "tax",
  "total",
  "status",
  "category_name",
  "due_date",
  "payment_status",
  "amount_paid",
] as const;

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Must be registered before "/invoices/:id" or "export" would be parsed as an id.
invoicesRouter.get("/invoices/export", async (req, res) => {
  const isAdmin = req.user?.role === "admin";
  const params: unknown[] = [];
  let where = "";
  if (!isAdmin) {
    params.push(req.user?.id);
    where = `WHERE i.created_by = $${params.length}`;
  }

  const result = await pool.query(`${SELECT_INVOICE} ${where} ORDER BY i.created_at DESC`, params);

  const header = CSV_COLUMNS.join(",");
  const rows = result.rows.map((row) => CSV_COLUMNS.map((col) => csvEscape(row[col])).join(","));
  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="invoices.csv"');
  res.send(csv);
});

invoicesRouter.get("/invoices", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const paymentStatus = typeof req.query.payment_status === "string" ? req.query.payment_status : undefined;
  const overdue = req.query.overdue === "true";
  const isAdmin = req.user?.role === "admin";

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status && VALID_STATUSES.has(status)) {
    params.push(status);
    conditions.push(`i.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(v.name ILIKE $${params.length} OR i.invoice_number ILIKE $${params.length})`);
  }
  if (from && ISO_DATE.test(from)) {
    params.push(from);
    conditions.push(`i.invoice_date >= $${params.length}`);
  }
  if (to && ISO_DATE.test(to)) {
    params.push(to);
    conditions.push(`i.invoice_date <= $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`i.category_id = $${params.length}`);
  }
  if (paymentStatus && VALID_PAYMENT_STATUSES.has(paymentStatus)) {
    params.push(paymentStatus);
    conditions.push(`i.payment_status = $${params.length}`);
  }
  if (overdue) {
    conditions.push(`i.payment_status IN ('unpaid', 'partial') AND i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE`);
  }
  if (!isAdmin) {
    params.push(req.user?.id);
    conditions.push(`i.created_by = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(`${SELECT_INVOICE} ${where} ORDER BY i.created_at DESC`, params);

  res.json(result.rows);
});

invoicesRouter.get("/invoices/:id", async (req, res) => {
  const invoiceResult = await pool.query(`${SELECT_INVOICE} WHERE i.id = $1`, [req.params.id]);
  const invoice = invoiceResult.rows[0];
  if (!invoice || (req.user?.role !== "admin" && invoice.created_by !== req.user?.id)) {
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
  if (!invoice || (req.user?.role !== "admin" && invoice.created_by !== req.user?.id)) {
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
      `INSERT INTO extraction_feedback (invoice_id, field_name, extracted_value, corrected_value, corrected_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.params.id,
        field,
        invoice[field] === null ? null : String(invoice[field]),
        String(newValue),
        req.user?.id ?? null,
      ]
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

  await logAudit(req.user?.id ?? null, "invoice.correct", "invoice", req.params.id, {
    fields: correctedFields,
  });

  const updated = await pool.query("SELECT * FROM invoices WHERE id = $1", [req.params.id]);
  res.json(updated.rows[0]);
});

async function loadOwnedInvoice(req: { params: { id: string }; user?: { id: string; role: string } }) {
  const result = await pool.query("SELECT id, created_by FROM invoices WHERE id = $1", [req.params.id]);
  const invoice = result.rows[0];
  if (!invoice || (req.user?.role !== "admin" && invoice.created_by !== req.user?.id)) {
    return null;
  }
  return invoice;
}

invoicesRouter.patch("/invoices/:id/category", async (req, res) => {
  const { category_id } = req.body ?? {};
  if (category_id !== null && category_id !== undefined && typeof category_id !== "string") {
    res.status(400).json({ error: "category_id must be a string or null" });
    return;
  }

  const invoice = await loadOwnedInvoice(req);
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const result = await pool.query(
    `UPDATE invoices SET category_id = $1, updated_at = now() WHERE id = $2 RETURNING id, category_id`,
    [category_id ?? null, req.params.id]
  );
  res.json(result.rows[0]);
});

interface PaymentBody {
  due_date?: string | null;
  payment_status?: "paid" | "unpaid" | "partial";
  amount_paid?: number;
}

// Payment tracking is deliberately separate from the extraction-correction
// endpoint above — due date and paid/unpaid/partial aren't extracted fields,
// so they don't belong in extraction_feedback.
invoicesRouter.patch("/invoices/:id/payment", async (req, res) => {
  const body = req.body as PaymentBody;

  const invoice = await loadOwnedInvoice(req);
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const setClauses: string[] = ["updated_at = now()"];
  const values: unknown[] = [];
  let amountPaidHandled = false;

  if (body.due_date !== undefined) {
    if (body.due_date !== null && !ISO_DATE.test(body.due_date)) {
      res.status(400).json({ error: "due_date must be an ISO date (YYYY-MM-DD) or null" });
      return;
    }
    values.push(body.due_date);
    setClauses.push(`due_date = $${values.length}`);
  }
  if (body.payment_status !== undefined) {
    if (!VALID_PAYMENT_STATUSES.has(body.payment_status)) {
      res.status(400).json({ error: "payment_status must be 'paid', 'unpaid', or 'partial'" });
      return;
    }
    values.push(body.payment_status);
    setClauses.push(`payment_status = $${values.length}`);
    setClauses.push(`paid_at = ${body.payment_status === "paid" ? "now()" : "NULL"}`);

    // Paid/unpaid fully determine the amount — fully covered or nothing paid
    // yet. "partial" takes its amount from the field below.
    if (body.payment_status === "paid") {
      setClauses.push(`amount_paid = COALESCE(total, 0)`);
      amountPaidHandled = true;
    } else if (body.payment_status === "unpaid") {
      setClauses.push(`amount_paid = 0`);
      amountPaidHandled = true;
    }
  }
  if (!amountPaidHandled && body.amount_paid !== undefined) {
    if (typeof body.amount_paid !== "number" || !Number.isFinite(body.amount_paid) || body.amount_paid < 0) {
      res.status(400).json({ error: "amount_paid must be a non-negative number" });
      return;
    }
    values.push(body.amount_paid);
    setClauses.push(`amount_paid = $${values.length}`);
  }

  values.push(req.params.id);
  const result = await pool.query(
    `UPDATE invoices SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );

  await logAudit(req.user?.id ?? null, "invoice.payment_update", "invoice", req.params.id, {
    due_date: body.due_date,
    payment_status: body.payment_status,
    amount_paid: body.amount_paid,
  });

  res.json(result.rows[0]);
});
