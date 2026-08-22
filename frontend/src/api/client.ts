import type { User } from "../types/auth";
import type { InvoiceDetailRecord, InvoiceSummary } from "../types/invoice";

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
}

export function listInvoices(filters: InvoiceFilters = {}): Promise<InvoiceSummary[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
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
