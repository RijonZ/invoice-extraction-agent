import { Router } from "express";
import { pool } from "../db/pool.js";
import { AUTH_COOKIE_NAME, requireAuth } from "../middleware/auth.js";
import { hashPassword, signToken, verifyPassword } from "../services/auth.js";
import { logAudit } from "../services/audit.js";
import type { AuthUser } from "../types/user.js";

export const authRouter = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

authRouter.post("/auth/register", async (req, res) => {
  const { email, password, name } = req.body ?? {};
  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password, and name are required" });
    return;
  }

  // The very first account bootstraps as admin; every account after that is
  // a regular user until an admin promotes them from the Users page.
  const existing = await pool.query("SELECT id FROM users LIMIT 1");
  const role = existing.rows.length === 0 ? "admin" : "user";
  const passwordHash = await hashPassword(password);

  try {
    const inserted = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role`,
      [String(email).toLowerCase().trim(), passwordHash, name, role]
    );
    const user = inserted.rows[0] as AuthUser;
    const token = signToken(user);
    res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS);
    await logAudit(user.id, "user.register", "user", user.id, { role: user.role });
    res.status(201).json(user);
  } catch {
    res.status(409).json({ error: "An account with that email already exists" });
  }
});

authRouter.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const result = await pool.query(
    "SELECT id, email, name, role, password_hash, is_active FROM users WHERE email = $1",
    [String(email).toLowerCase().trim()]
  );
  const row = result.rows[0];
  if (!row || !row.is_active || !(await verifyPassword(password, row.password_hash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const user: AuthUser = { id: row.id, email: row.email, name: row.name, role: row.role };
  const token = signToken(user);
  res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS);
  await logAudit(user.id, "user.login", "user", user.id);
  res.json(user);
});

authRouter.post("/auth/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.status(204).send();
});

authRouter.get("/auth/me", requireAuth, (req, res) => {
  res.json(req.user);
});

authRouter.patch("/auth/me", requireAuth, async (req, res) => {
  const { name } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const result = await pool.query(
    `UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, role`,
    [name.trim(), req.user?.id]
  );
  const user = result.rows[0] as AuthUser;

  // Re-issue the token so the name embedded in future requests is current.
  const token = signToken(user);
  res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS);
  await logAudit(user.id, "user.update_profile", "user", user.id, { name: user.name });
  res.json(user);
});

authRouter.post("/auth/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (String(newPassword).length < 8) {
    res.status(400).json({ error: "newPassword must be at least 8 characters" });
    return;
  }

  const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [
    req.user?.id,
  ]);
  const row = result.rows[0];
  if (!row || !(await verifyPassword(currentPassword, row.password_hash))) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await hashPassword(newPassword);
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
    newHash,
    req.user?.id,
  ]);
  await logAudit(req.user?.id ?? null, "user.change_password", "user", req.user?.id ?? null);
  res.status(204).send();
});
