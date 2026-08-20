import type { ExtractedInvoice } from "../types/invoice.js";

const AMOUNT_TOLERANCE = 0.02;

function approximatelyEqual(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance;
}

/**
 * Deterministic, non-LLM checks. Returns a list of human-readable problems;
 * an empty list means the invoice is safe to auto-approve.
 */
export function validateInvoice(data: ExtractedInvoice, missingCriticalFields: string[]): string[] {
  const errors: string[] = [];

  for (const field of missingCriticalFields) {
    errors.push(`Required field "${field}" could not be extracted from the document.`);
  }

  if (data.line_items.length === 0) {
    errors.push("No line items were extracted.");
  }

  const lineItemsWithAmount = data.line_items.filter((item) => item.amount !== null);
  if (lineItemsWithAmount.length > 0 && data.subtotal !== null) {
    const sum = lineItemsWithAmount.reduce((acc, item) => acc + (item.amount ?? 0), 0);
    if (!approximatelyEqual(sum, data.subtotal, AMOUNT_TOLERANCE)) {
      errors.push(
        `Line items sum to ${sum.toFixed(2)} but the extracted subtotal is ${data.subtotal.toFixed(2)}.`
      );
    }
  }

  if (data.subtotal !== null && data.total !== null) {
    const expectedTotal = data.subtotal + (data.tax ?? 0);
    if (!approximatelyEqual(expectedTotal, data.total, AMOUNT_TOLERANCE)) {
      errors.push(
        `Subtotal (${data.subtotal.toFixed(2)}) + tax (${(data.tax ?? 0).toFixed(2)}) = ` +
          `${expectedTotal.toFixed(2)}, which does not match the extracted total ` +
          `(${data.total.toFixed(2)}).`
      );
    }
  }

  return errors;
}
