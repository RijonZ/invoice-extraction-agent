import { pool } from "../db/pool.js";

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

const COLUMNS =
  "extraction_model, amount_tolerance, company_name, max_extraction_attempts, default_currency, banner_message";

export async function getSettings(): Promise<AppSettings> {
  const result = await pool.query(`SELECT ${COLUMNS} FROM app_settings WHERE id = 1`);
  const row = result.rows[0];
  if (!row) {
    throw new Error("app_settings row is missing — did migration 004 run?");
  }
  return {
    extraction_model: row.extraction_model,
    amount_tolerance: Number(row.amount_tolerance),
    company_name: row.company_name,
    max_extraction_attempts: Number(row.max_extraction_attempts),
    default_currency: row.default_currency,
    banner_message: row.banner_message,
  };
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const { company_name, banner_message } = await getSettings();
  return { company_name, banner_message };
}

export async function updateSettings(changes: Partial<AppSettings>): Promise<AppSettings> {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  const fields: Array<keyof AppSettings> = [
    "extraction_model",
    "amount_tolerance",
    "company_name",
    "max_extraction_attempts",
    "default_currency",
    "banner_message",
  ];
  for (const field of fields) {
    if (changes[field] !== undefined) {
      values.push(changes[field]);
      setClauses.push(`${field} = $${values.length}`);
    }
  }
  if (setClauses.length === 0) {
    return getSettings();
  }

  await pool.query(`UPDATE app_settings SET ${setClauses.join(", ")} WHERE id = 1`, values);
  return getSettings();
}
