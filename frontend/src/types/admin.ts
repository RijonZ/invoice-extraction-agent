import type { InvoiceSummary } from "./invoice";

export interface Vendor {
  id: string;
  name: string;
  created_at: string;
  invoice_count: number;
  total_spend: number;
}

export interface VendorDetail extends Vendor {
  invoices: InvoiceSummary[];
}

export interface MonthlySpendPoint {
  month: string;
  total: number;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface CorrectionFrequency {
  field_name: string;
  count: number;
}

export interface CategorySpend {
  category_name: string;
  total_spend: number;
}

export interface AnalyticsSummary {
  monthly_spend: MonthlySpendPoint[];
  top_vendors: Array<{ id: string; name: string; invoice_count: number; total_spend: number }>;
  status_breakdown: StatusCount[];
  correction_frequency: CorrectionFrequency[];
  spend_by_category: CategorySpend[];
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
}

export interface AppSettings {
  extraction_model: string;
  amount_tolerance: number;
  company_name: string;
  max_extraction_attempts: number;
  default_currency: string;
  banner_message: string | null;
}

export interface PublicSettings {
  company_name: string;
  banner_message: string | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
}
