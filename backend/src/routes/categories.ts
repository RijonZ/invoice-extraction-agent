import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAdmin } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";

export const categoriesRouter = Router();

// Any signed-in user can list categories (needed to categorize their own
// invoices) — creating/renaming/deleting is admin-only.
categoriesRouter.get("/categories", async (_req, res) => {
  const result = await pool.query("SELECT id, name, created_at FROM categories ORDER BY name");
  res.json(result.rows);
});

categoriesRouter.post("/categories", requireAdmin, async (req, res) => {
  const { name } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const result = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING id, name, created_at",
      [name.trim()]
    );
    await logAudit(req.user?.id ?? null, "category.create", "category", result.rows[0].id, { name });
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(409).json({ error: "A category with that name already exists" });
  }
});

categoriesRouter.patch("/categories/:id", requireAdmin, async (req, res) => {
  const { name } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const result = await pool.query(
    "UPDATE categories SET name = $1 WHERE id = $2 RETURNING id, name, created_at",
    [name.trim(), req.params.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  await logAudit(req.user?.id ?? null, "category.rename", "category", req.params.id, { name });
  res.json(result.rows[0]);
});

// Invoices referencing a deleted category fall back to uncategorized
// (ON DELETE SET NULL on invoices.category_id) rather than blocking the delete.
categoriesRouter.delete("/categories/:id", requireAdmin, async (req, res) => {
  const result = await pool.query("DELETE FROM categories WHERE id = $1 RETURNING id", [req.params.id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  await logAudit(req.user?.id ?? null, "category.delete", "category", req.params.id);
  res.status(204).send();
});
