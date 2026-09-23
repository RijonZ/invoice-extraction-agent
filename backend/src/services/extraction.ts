import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { env } from "../config/env.js";
import { CRITICAL_FIELDS, extractedInvoiceSchema, type ExtractedInvoice } from "../types/invoice.js";

const client = new OpenAI({ apiKey: env.openaiApiKey });

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function buildDocumentBlock(fileBuffer: Buffer, mimeType: string) {
  const base64 = fileBuffer.toString("base64");
  if (mimeType === "application/pdf") {
    return {
      type: "input_file" as const,
      filename: "invoice.pdf",
      file_data: `data:application/pdf;base64,${base64}`,
    };
  }
  if (SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    return {
      type: "input_image" as const,
      image_url: `data:${mimeType};base64,${base64}`,
      detail: "auto" as const,
    };
  }
  throw new Error(`Unsupported file type for extraction: ${mimeType}`);
}

// Invoices in this pipeline aren't limited to English — Albanian-language
// invoices are common enough (different field labels, date format, and
// decimal convention) that the model needs explicit guidance rather than
// relying on it to generalize on its own.
const BASE_INSTRUCTION =
  "Extract every field from this invoice: vendor name, client name, invoice number, " +
  "invoice date (ISO 8601), currency (ISO 4217), each line item (description, quantity, " +
  "unit price, amount), subtotal, tax, and total. If a field genuinely does not appear " +
  "anywhere on the document, return null for it rather than guessing.\n\n" +
  "An invoice names two different parties, and they are not interchangeable:\n" +
  "- vendor_name: whoever ISSUED the invoice and is owed the money — the seller/supplier. " +
  'Usually the party in the header, near a logo, or labeled "From", "Seller", or ' +
  '"Faturoi" (Albanian for "invoiced by").\n' +
  "- client_name: whoever RECEIVED the invoice and is responsible for paying it — the " +
  'buyer/customer. Usually labeled "Bill To", "Customer", "Client", or on Albanian ' +
  'invoices "Klienti" or "Blerësi".\n' +
  "Determine each one from its role on the document (who is billing whom), not from " +
  "position or order alone — layouts vary. If only one party is named and it genuinely " +
  "isn't possible to tell whether it's the vendor or the client, return null for the one " +
  "you can't determine rather than guessing or duplicating the same name into both fields.\n\n" +
  "The invoice may be in any language, including Albanian. Recognize these Albanian " +
  "invoice terms and map them to the same fields as their English equivalents:\n" +
  '- "Fature"/"Faturë"/"Nr. Faturës"/"Nr. Fature" → invoice number\n' +
  '- "Data"/"Data e lëshimit"/"Data e faturës" → invoice date\n' +
  '- "Shitësi"/"Furnitori"/"Kompania"/"Faturoi" → vendor name\n' +
  '- "Klienti"/"Blerësi"/"Pranoi" → client name\n' +
  '- "Përshkrimi"/"Artikulli" → line item description\n' +
  '- "Sasia" → quantity, "Çmimi"/"Çmimi njësi" → unit price\n' +
  '- "Nëntotali"/"Vlera pa TVSH" → subtotal, "TVSH" → tax (Albanian VAT)\n' +
  '- "Totali"/"Total për pagesë"/"Shuma totale" → total\n' +
  '- "Lekë"/"Lek"/"ALL" is the Albanian Lek currency code.\n' +
  "Albanian (and other European-format) invoices often write dates as DD.MM.YYYY or " +
  "DD/MM/YYYY — convert these to ISO 8601 (YYYY-MM-DD). Numbers may use \".\" as a " +
  'thousands separator and "," as the decimal separator (e.g. "1.234,56" means 1234.56, ' +
  "not one thousand two hundred thirty-four point 56 as an English reader might assume) " +
  "— always normalize numeric fields to plain numbers regardless of the source formatting.";

const STRING_FIELDS = [
  "vendor_name",
  "client_name",
  "invoice_number",
  "invoice_date",
  "currency",
] as const;

// On documents with nothing to extract (a bank-statement line mentioning a
// vendor, not an actual invoice), the model sometimes emits placeholder
// punctuation like "." instead of following the null instruction. Treat
// anything with no alphanumeric content as missing, so it flows through the
// same missing-field retry/review path as a genuine null.
const PLACEHOLDER_ONLY = /^[\s.\-–—_,;:]*$/;

function sanitizeStringFields(data: ExtractedInvoice): ExtractedInvoice {
  const sanitized = { ...data };
  for (const field of STRING_FIELDS) {
    const value = sanitized[field];
    if (value !== null && PLACEHOLDER_ONLY.test(value)) {
      sanitized[field] = null;
    }
  }
  return sanitized;
}

export interface ExtractionResult {
  data: ExtractedInvoice;
  missingCriticalFields: string[];
  attempts: number;
}

export async function extractInvoice(
  fileBuffer: Buffer,
  mimeType: string,
  model: string,
  maxAttempts: number
): Promise<ExtractionResult> {
  const documentBlock = buildDocumentBlock(fileBuffer, mimeType);

  let lastData: ExtractedInvoice | null = null;
  let lastMissing: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const instruction =
      attempt === 1
        ? BASE_INSTRUCTION
        : `${BASE_INSTRUCTION}\n\nOn the previous attempt these fields came back missing: ` +
          `${lastMissing.join(", ")}. Look again specifically for them — check headers, ` +
          "footers, and totals sections closely. Only return null if the field is truly " +
          "absent from the document.";

    const response = await client.responses.parse({
      model,
      input: [
        {
          role: "user",
          content: [documentBlock, { type: "input_text", text: instruction }],
        },
      ],
      text: { format: zodTextFormat(extractedInvoiceSchema, "invoice") },
    });

    const parsedRaw = response.output_parsed;
    if (!parsedRaw) {
      lastMissing = [...CRITICAL_FIELDS];
      continue;
    }
    const parsed = sanitizeStringFields(parsedRaw);

    lastData = parsed;
    lastMissing = CRITICAL_FIELDS.filter((field) => parsed[field] === null);

    if (lastMissing.length === 0) {
      return { data: lastData, missingCriticalFields: [], attempts: attempt };
    }
  }

  if (!lastData) {
    throw new Error("Extraction failed: no valid structured output after retries");
  }

  return { data: lastData, missingCriticalFields: lastMissing, attempts: maxAttempts };
}
