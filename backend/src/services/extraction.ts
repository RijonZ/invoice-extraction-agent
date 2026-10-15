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
  "First, decide whether this document is actually an invoice, receipt, bill, purchase " +
  "order, or bank/card payment confirmation — a document representing one specific " +
  "commercial transaction with an amount owed or paid. Many files sent through this " +
  "pipeline will NOT be that: project plans, reports, articles, resumes, contracts, " +
  "screenshots, or general correspondence. If the document is not one of those " +
  "transactional document types, set is_invoice to false and return null for every " +
  "other field (and an empty line_items array) — do not extract, invent, or repurpose " +
  "any name, date, or number from it just because the schema has a slot for it. If it " +
  "IS a genuine invoice/receipt/transaction document, set is_invoice to true and " +
  "extract normally per the rules below.\n\n" +
  "Before anything else, the rule you are most likely to get wrong: do not invent a " +
  "subtotal or tax value. Many real documents — bank transaction confirmations, simple " +
  "receipts, one-line invoices — print only a single total, with no subtotal/tax " +
  "breakdown anywhere on them. On those documents the correct output is subtotal: null, " +
  "tax: null. Extract a subtotal or tax figure ONLY if you can point to a line on the " +
  "page literally labeled subtotal/nëntotali or tax/TVSH with its own printed number " +
  "next to it. Never back-compute one from the total (e.g. total split into a plausible " +
  "subtotal plus an estimated ~10% tax) and never output round, made-up-looking pairs " +
  "like 50.00/5.00 or 350.00/350.00 just because a number was expected there — if you " +
  "did that, you would be fabricating financial data, which is a worse error than " +
  "leaving the field null. This rule overrides any instinct to make subtotal + tax add " +
  "up to the total: an unreconciled null is correct far more often than an invented " +
  "number that reconciles.\n\n" +
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
  '- "Lekë"/"Lek"/"ALL" is the Albanian Lek currency code.\n\n' +
  "This pipeline also receives bank or card transaction confirmations (e-banking " +
  'receipts), not just merchant-issued invoices — recognize these by headers like ' +
  '"Detajet e transaksionit" ("Transaction details"), "Urdhërdhënësi" ("Originator"), or ' +
  "a bank logo with a confirmation stamp, instead of a normal invoice layout. On these " +
  "documents:\n" +
  '- vendor_name: the actual merchant that was paid. The beneficiary field ("Emri i ' +
  'përfituesit") is often a generic label like "Blerje ne POS" ("POS purchase") rather ' +
  "than a real merchant name — when that happens, find the real merchant inside the " +
  'transaction description field instead (e.g. "Blerje me kartele MVKGR4AB ' +
  'WWW.NAMECHEAP NAME-CHEAP.CO 2026.08.15 17:11 RIJON" names the merchant as ' +
  '"Namecheap", not "Blerje ne POS").\n' +
  '- client_name: the account holder who made the payment ("Urdhërdhënësi"/"Originator"/' +
  '"Payer") — whose account the money left.\n' +
  '- invoice_number: the transaction number ("Numri i transaksionit") or a card ' +
  "authorization code, whichever is present.\n" +
  "- invoice_date: the actual purchase date and time embedded in the transaction " +
  'description, if present, rather than the bank\'s settlement date ("Data e valutës") — ' +
  "a card purchase is often settled by the bank a day or more after it actually " +
  "happened, and the purchase date is what matters for expense records.\n" +
  '- total: the single amount printed on the "Vlera"/"Shuma" line, with currency from ' +
  "its suffix or the account currency code. Copy that number exactly. Never use, " +
  "combine, or derive the total from any other number on the document — account " +
  "numbers, transaction numbers, phone numbers, and dates are not amounts, even when " +
  "part of one happens to look like a plausible total.\n" +
  "- line_items, subtotal, and tax do not apply to a bank transaction confirmation — " +
  "return an empty line_items array and null for subtotal/tax rather than guessing.\n" +
  'Dates on these bank confirmations are usually written YYYY.MM.DD (e.g. "2026.08.15" ' +
  "means 15 August 2026, year first) rather than the day-first format regular invoices " +
  "use — go by which segment is a plausible year, not by position alone.\n\n" +
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

// Prompt instructions alone haven't reliably stopped the model from
// inventing a subtotal/tax breakdown on documents that don't have one
// (bank transaction confirmations especially) — in practice it fabricates
// numbers that don't even reconcile with the correctly-extracted total.
// With no line items to independently verify a subtotal against, an
// unreconciled subtotal+tax is far more likely a fabrication than a real
// value paired with a wrong total, so drop both rather than surface
// fabricated financial figures. This only fires when there's nothing to
// cross-check against and the numbers don't add up — a genuine subtotal/tax
// that correctly sums to the total is left untouched either way.
function sanitizeUnverifiableAmounts(data: ExtractedInvoice): ExtractedInvoice {
  if (data.line_items.length > 0) return data;
  if (data.subtotal === null || data.total === null) return data;
  const reconciled = Math.abs(data.subtotal + (data.tax ?? 0) - data.total) <= 0.02;
  if (reconciled) return data;
  return { ...data, subtotal: null, tax: null };
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
          "absent from the document. This extra scrutiny applies only to the fields " +
          "listed above — every other field, including subtotal, tax, and total, must " +
          "be read exactly the same way as on a first attempt: copied from an explicit " +
          "printed figure, never invented or re-derived just because this is a retry.";

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
    const parsed = sanitizeUnverifiableAmounts(sanitizeStringFields(parsedRaw));

    // Not an invoice at all — every other field is legitimately null, so
    // there's nothing a retry could improve. Return immediately rather than
    // feeding this into the missing-critical-field retry loop, which would
    // otherwise pressure the model into inventing a vendor/total on attempt 2.
    if (!parsed.is_invoice) {
      return { data: parsed, missingCriticalFields: [], attempts: attempt };
    }

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
