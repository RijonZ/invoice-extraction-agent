import { pool } from "../db/pool.js";

export async function logAudit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await pool.query(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, entityType, entityId, JSON.stringify(metadata)]
  );
}
