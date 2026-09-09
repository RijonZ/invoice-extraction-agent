import { Router } from "express";
import { pool } from "../db/pool.js";

export const notificationsRouter = Router();

// Notifications are derived from invoices needing attention (status
// needs_review/error), scoped the same way the invoice list is: admins see
// every invoice, everyone else only their own. Per-user read/dismiss state
// lives in notification_state, keyed by (user_id, invoice_id).
notificationsRouter.get("/notifications", async (req, res) => {
  const userId = req.user?.id;
  const isAdmin = req.user?.role === "admin";
  const params: unknown[] = [userId];
  let ownership = "";
  if (!isAdmin) {
    params.push(userId);
    ownership = `AND i.created_by = $${params.length}`;
  }

  const result = await pool.query(
    `SELECT i.id AS invoice_id, i.status, i.invoice_number, i.invoice_date, i.total, i.created_at,
            v.name AS vendor_name, ns.read_at
     FROM invoices i
     LEFT JOIN vendors v ON v.id = i.vendor_id
     LEFT JOIN notification_state ns ON ns.invoice_id = i.id AND ns.user_id = $1
     WHERE i.status IN ('needs_review', 'error')
       AND ns.dismissed_at IS NULL
       ${ownership}
     ORDER BY i.created_at DESC`,
    params
  );

  res.json(
    result.rows.map((row) => ({
      invoice_id: row.invoice_id,
      status: row.status,
      vendor_name: row.vendor_name,
      invoice_number: row.invoice_number,
      invoice_date: row.invoice_date,
      total: row.total,
      created_at: row.created_at,
      is_read: row.read_at !== null,
    }))
  );
});

notificationsRouter.post("/notifications/read-all", async (req, res) => {
  const userId = req.user?.id;
  const isAdmin = req.user?.role === "admin";
  const params: unknown[] = [userId];
  let ownership = "";
  if (!isAdmin) {
    params.push(userId);
    ownership = `AND i.created_by = $${params.length}`;
  }

  await pool.query(
    `INSERT INTO notification_state (user_id, invoice_id, read_at)
     SELECT $1, i.id, now()
     FROM invoices i
     LEFT JOIN notification_state ns ON ns.invoice_id = i.id AND ns.user_id = $1
     WHERE i.status IN ('needs_review', 'error')
       AND ns.dismissed_at IS NULL
       ${ownership}
     ON CONFLICT (user_id, invoice_id) DO UPDATE SET read_at = now()`,
    params
  );
  res.json({ ok: true });
});

notificationsRouter.post("/notifications/:invoiceId/read", async (req, res) => {
  await pool.query(
    `INSERT INTO notification_state (user_id, invoice_id, read_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id, invoice_id) DO UPDATE SET read_at = COALESCE(notification_state.read_at, now())`,
    [req.user?.id, req.params.invoiceId]
  );
  res.json({ ok: true });
});

notificationsRouter.delete("/notifications/:invoiceId", async (req, res) => {
  await pool.query(
    `INSERT INTO notification_state (user_id, invoice_id, dismissed_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id, invoice_id) DO UPDATE SET dismissed_at = now()`,
    [req.user?.id, req.params.invoiceId]
  );
  res.json({ ok: true });
});
