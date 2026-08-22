export type InvoiceStatus = "processing" | "needs_review" | "approved" | "error";

export interface LineItem {
  id: string;
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
}

export interface InvoiceSummary {
  id: string;
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total: number | null;
  status: InvoiceStatus;
  created_at: string;
}

export interface InvoiceDetailRecord extends InvoiceSummary {
  currency: string | null;
  subtotal: number | null;
  tax: number | null;
  validation_errors: string[];
  file_url: string;
  mime_type: string;
  line_items: LineItem[];
}
