import type {
  AnalyticsSummary,
  AppSettings,
  AuditLogEntry,
  Category,
  ManagedUser,
  MyStats,
  PublicSettings,
  Vendor,
  VendorDetail,
} from "../types/admin";
import type { User } from "../types/auth";
import type { InvoiceDetailRecord, InvoiceSummary, Notification, PaymentStatus } from "../types/invoice";

const BASE_URL = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export interface InvoiceFilters {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}

export function listInvoices(filters: InvoiceFilters = {}): Promise<InvoiceSummary[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();
  return request(`/invoices${query ? `?${query}` : ""}`);
}

export function getInvoice(id: string): Promise<InvoiceDetailRecord> {
  return request(`/invoices/${id}`);
}

export function correctInvoice(
  id: string,
  corrections: Record<string, string | number | null>
): Promise<InvoiceDetailRecord> {
  return request(`/invoices/${id}/correct`, {
    method: "PATCH",
    body: JSON.stringify({ corrections }),
  });
}

export function updateProfile(name: string): Promise<User> {
  return request("/auth/me", { method: "PATCH", body: JSON.stringify({ name }) });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await request("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function getPublicSettings(): Promise<PublicSettings> {
  return request("/settings/public");
}

export function getAppSettings(): Promise<AppSettings> {
  return request("/admin/settings");
}

export function updateAppSettings(changes: Partial<AppSettings>): Promise<AppSettings> {
  return request("/admin/settings", { method: "PATCH", body: JSON.stringify(changes) });
}

export function setInvoiceCategory(
  id: string,
  categoryId: string | null
): Promise<{ id: string; category_id: string | null }> {
  return request(`/invoices/${id}/category`, {
    method: "PATCH",
    body: JSON.stringify({ category_id: categoryId }),
  });
}

export function updateInvoicePayment(
  id: string,
  changes: { due_date?: string | null; payment_status?: PaymentStatus; amount_paid?: number }
): Promise<InvoiceDetailRecord> {
  return request(`/invoices/${id}/payment`, { method: "PATCH", body: JSON.stringify(changes) });
}

export const EXPORT_CSV_URL = `${BASE_URL}/invoices/export`;

export function listCategories(): Promise<Category[]> {
  return request("/categories");
}

export function createCategory(name: string): Promise<Category> {
  return request("/categories", { method: "POST", body: JSON.stringify({ name }) });
}

export function renameCategory(id: string, name: string): Promise<Category> {
  return request(`/categories/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
}

export async function deleteCategory(id: string): Promise<void> {
  await request(`/categories/${id}`, { method: "DELETE" });
}

export function listVendors(): Promise<Vendor[]> {
  return request("/vendors");
}

export function renameVendor(id: string, name: string): Promise<Vendor> {
  return request(`/vendors/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
}

export async function mergeVendor(sourceId: string, targetId: string): Promise<void> {
  await request(`/vendors/${sourceId}/merge/${targetId}`, { method: "POST" });
}

export function getVendor(id: string): Promise<VendorDetail> {
  return request(`/vendors/${id}`);
}

export function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  return request("/analytics/summary");
}

export function listUsers(): Promise<ManagedUser[]> {
  return request("/users");
}

export function updateUser(
  id: string,
  changes: { role?: "admin" | "user"; is_active?: boolean }
): Promise<ManagedUser> {
  return request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export function listAuditLog(): Promise<AuditLogEntry[]> {
  return request("/audit-log");
}

export function listMyActivity(): Promise<AuditLogEntry[]> {
  return request("/audit-log/me");
}

export function getMyStats(): Promise<MyStats> {
  return request("/me/stats");
}

export function listNotifications(): Promise<Notification[]> {
  return request("/notifications");
}

export async function markNotificationRead(invoiceId: string): Promise<void> {
  await request(`/notifications/${invoiceId}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await request("/notifications/read-all", { method: "POST" });
}

export async function deleteNotification(invoiceId: string): Promise<void> {
  await request(`/notifications/${invoiceId}`, { method: "DELETE" });
}

export function getMe(): Promise<User> {
  return request("/auth/me");
}

export function login(email: string, password: string): Promise<User> {
  return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function register(email: string, password: string, name: string): Promise<User> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function logout(): Promise<void> {
  await fetch(`${BASE_URL}/auth/logout`, { method: "POST" });
}

export async function uploadInvoice(file: File): Promise<InvoiceDetailRecord> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${BASE_URL}/upload`, { method: "POST", body: formData });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error ?? `Upload failed: ${response.status}`);
  }
  return response.json();
}
