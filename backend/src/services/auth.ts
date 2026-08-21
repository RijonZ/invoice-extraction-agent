import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthUser } from "../types/user.js";

const SALT_ROUNDS = 10;
const TOKEN_TTL = "7d";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, env.jwtSecret, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, env.jwtSecret) as AuthUser;
  } catch {
    return null;
  }
}
