import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAdmin } from "../middleware/auth.js";

export const auditRouter = Router();

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// requireAdmin is per-route, not router-level — see the comment in
// routes/vendors.ts for why an unconditional router.use() here would
// incorrectly gate unrelated paths mounted after this router.
auditRouter.get("/audit-log", requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const result = await pool.query(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
            u.name AS user_name, u.email AS user_email
     FROM audit_log a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  res.json(result.rows);
});

// Personal activity feed — any signed-in user can see their own actions,
// no requireAdmin here (unlike the full log above).
auditRouter.get("/audit-log/me", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const result = await pool.query(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at
     FROM audit_log a
     WHERE a.user_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.user?.id, limit, offset]
  );
  res.json(result.rows);
});
