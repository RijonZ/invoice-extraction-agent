import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAdmin } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";

export const usersRouter = Router();

// requireAdmin is per-route, not router-level — see the comment in
// routes/vendors.ts for why an unconditional router.use() here would
// incorrectly gate unrelated paths mounted after this router.
usersRouter.get("/users", requireAdmin, async (_req, res) => {
  const result = await pool.query(
    `SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at ASC`
  );
  res.json(result.rows);
});

usersRouter.patch("/users/:id", requireAdmin, async (req, res) => {
  const { role, is_active } = req.body ?? {};
  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (role !== undefined) {
    if (role !== "admin" && role !== "user") {
      res.status(400).json({ error: "role must be 'admin' or 'user'" });
      return;
    }
    values.push(role);
    setClauses.push(`role = $${values.length}`);
  }
  if (is_active !== undefined) {
    values.push(Boolean(is_active));
    setClauses.push(`is_active = $${values.length}`);
  }
  if (setClauses.length === 0) {
    res.status(400).json({ error: "Nothing to update — pass role and/or is_active" });
    return;
  }

  values.push(req.params.id);
  const result = await pool.query(
    `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${values.length}
     RETURNING id, email, name, role, is_active, created_at`,
    values
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await logAudit(req.user?.id ?? null, "user.update", "user", req.params.id, {
    role,
    is_active,
  });
  res.json(result.rows[0]);
});
