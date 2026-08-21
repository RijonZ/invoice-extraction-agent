import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../services/auth.js";
import type { AuthUser } from "../types/user.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const AUTH_COOKIE_NAME = "invoice_agent_token";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
  const user = token ? verifyToken(token) : null;
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  req.user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
