import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { env } from "../config/env.js";
import { CRITICAL_FIELDS, extractedInvoiceSchema, type ExtractedInvoice } from "../types/invoice.js";

const client = new OpenAI({ apiKey: env.openaiApiKey });

const MAX_ATTEMPTS = 3;

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

const BASE_INSTRUCTION =
  "Extract every field from this invoice: vendor name, invoice number, invoice date " +
  "(ISO 8601), currency (ISO 4217), each line item (description, quantity, unit price, " +
  "amount), subtotal, tax, and total. If a field genuinely does not appear anywhere on " +
  "the document, return null for it rather than guessing.";

export interface ExtractionResult {
  data: ExtractedInvoice;
  missingCriticalFields: string[];
  attempts: number;
}

// Extract -> check for missing critical fields -> retry with a sharper
// prompt if needed, up to MAX_ATTEMPTS.
export async function extractInvoice(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  const documentBlock = buildDocumentBlock(fileBuffer, mimeType);

  let lastData: ExtractedInvoice | null = null;
  let lastMissing: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const instruction =
      attempt === 1
        ? BASE_INSTRUCTION
        : `${BASE_INSTRUCTION}\n\nOn the previous attempt these fields came back missing: ` +
          `${lastMissing.join(", ")}. Look again specifically for them — check headers, ` +
          "footers, and totals sections closely. Only return null if the field is truly " +
          "absent from the document.";

    const response = await client.responses.parse({
      model: env.extractionModel,
      input: [
        {
          role: "user",
          content: [documentBlock, { type: "input_text", text: instruction }],
        },
      ],
      text: { format: zodTextFormat(extractedInvoiceSchema, "invoice") },
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      lastMissing = [...CRITICAL_FIELDS];
      continue;
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

  return { data: lastData, missingCriticalFields: lastMissing, attempts: MAX_ATTEMPTS };
}
