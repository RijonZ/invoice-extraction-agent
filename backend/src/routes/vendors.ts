import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAdmin } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";

export const vendorsRouter = Router();

// requireAdmin is applied per-route (not via router.use) — this router is
// mounted with app.use(vendorsRouter) with no path prefix, so every request
// the app receives passes through it; an unconditional router-level gate
// would block unrelated paths too, not just this router's own routes.
vendorsRouter.get("/vendors", requireAdmin, async (_req, res) => {
  const result = await pool.query(
    `SELECT v.id, v.name, v.created_at,
            COUNT(i.id)::int AS invoice_count,
            COALESCE(SUM(i.total), 0)::float AS total_spend
     FROM vendors v
     LEFT JOIN invoices i ON i.vendor_id = v.id
     GROUP BY v.id
     ORDER BY total_spend DESC`
  );
  res.json(result.rows);
});

vendorsRouter.get("/vendors/:id", requireAdmin, async (req, res) => {
  const vendorResult = await pool.query(
    `SELECT v.id, v.name, v.created_at,
            COUNT(i.id)::int AS invoice_count,
            COALESCE(SUM(i.total), 0)::float AS total_spend
     FROM vendors v
     LEFT JOIN invoices i ON i.vendor_id = v.id
     WHERE v.id = $1
     GROUP BY v.id`,
    [req.params.id]
  );
  const vendor = vendorResult.rows[0];
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  const invoices = await pool.query(
    `SELECT i.*, v.name AS vendor_name FROM invoices i
     LEFT JOIN vendors v ON v.id = i.vendor_id
     WHERE i.vendor_id = $1
     ORDER BY i.created_at DESC`,
    [req.params.id]
  );

  res.json({ ...vendor, invoices: invoices.rows });
});

vendorsRouter.patch("/vendors/:id", requireAdmin, async (req, res) => {
  const { name } = req.body ?? {};
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const normalizedKey = name.trim().toLowerCase();
  const result = await pool.query(
    `UPDATE vendors SET name = $1, normalized_key = $2 WHERE id = $3 RETURNING id, name`,
    [name.trim(), normalizedKey, req.params.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  await logAudit(req.user?.id ?? null, "vendor.rename", "vendor", req.params.id, { name });
  res.json(result.rows[0]);
});

// Reassigns every invoice from :id onto :targetId, then removes the
// now-empty source vendor — the fix for duplicate vendor names like
// "Namecheap" vs "NAMECHEAP INC" that extraction can produce.
vendorsRouter.post("/vendors/:id/merge/:targetId", requireAdmin, async (req, res) => {
  const { id, targetId } = req.params;
  if (id === targetId) {
    res.status(400).json({ error: "Cannot merge a vendor into itself" });
    return;
  }

  const target = await pool.query("SELECT id FROM vendors WHERE id = $1", [targetId]);
  if (target.rows.length === 0) {
    res.status(404).json({ error: "Target vendor not found" });
    return;
  }

  const source = await pool.query("SELECT id FROM vendors WHERE id = $1", [id]);
  if (source.rows.length === 0) {
    res.status(404).json({ error: "Source vendor not found" });
    return;
  }
  // Invoices must be repointed before the source vendor is deleted — it's
  // still referenced by a foreign key (no ON DELETE cascade) until then.
  await pool.query("UPDATE invoices SET vendor_id = $1 WHERE vendor_id = $2", [targetId, id]);
  await pool.query("DELETE FROM vendors WHERE id = $1", [id]);

  await logAudit(req.user?.id ?? null, "vendor.merge", "vendor", targetId, {
    merged_from: id,
  });
  res.status(204).send();
});
