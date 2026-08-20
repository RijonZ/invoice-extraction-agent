import { z } from "zod";

// Fields the model could not find on the document come back as null rather
// than being omitted or hallucinated — the schema keeps them
// required-but-nullable so a genuinely absent field is distinguishable from
// an extraction failure.
export const lineItemSchema = z
  .object({
    description: z.string(),
    quantity: z.number().nullable(),
    unit_price: z.number().nullable(),
    amount: z.number().nullable(),
  })
  .strict();

export const extractedInvoiceSchema = z
  .object({
    vendor_name: z.string().nullable(),
    invoice_number: z.string().nullable(),
    invoice_date: z.string().nullable().describe("ISO 8601 date, e.g. 2026-03-14"),
    currency: z.string().nullable().describe("ISO 4217 currency code, e.g. USD"),
    line_items: z.array(lineItemSchema),
    subtotal: z.number().nullable(),
    tax: z.number().nullable(),
    total: z.number().nullable(),
  })
  .strict();

export type ExtractedInvoice = z.infer<typeof extractedInvoiceSchema>;
export type LineItem = z.infer<typeof lineItemSchema>;

// Fields whose absence blocks auto-approval and triggers the extraction retry loop.
export const CRITICAL_FIELDS = ["vendor_name", "total"] as const;

export type InvoiceStatus = "processing" | "needs_review" | "approved" | "error";

export interface InvoiceRecord {
  id: string;
  vendor_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  currency: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  status: InvoiceStatus;
  validation_errors: string[];
  file_key: string;
  mime_type: string;
  raw_extraction: ExtractedInvoice | null;
  created_at: string;
  updated_at: string;
}
