export type Role = "admin" | "user";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface UserRecord extends AuthUser {
  is_active: boolean;
  created_at: string;
}
