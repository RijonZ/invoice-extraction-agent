import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const DEV_JWT_SECRET_FALLBACK = "dev-only-insecure-secret-change-me";
if (!process.env.JWT_SECRET) {
  console.warn(
    "JWT_SECRET is not set — using an insecure development fallback. Set JWT_SECRET before deploying."
  );
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  openaiApiKey: process.env.OPENAI_API_KEY,
  extractionModel: required("EXTRACTION_MODEL", "gpt-5.6"),
  jwtSecret: required("JWT_SECRET", DEV_JWT_SECRET_FALLBACK),
  databaseUrl: required(
    "DATABASE_URL",
    "postgresql://invoice_agent:invoice_agent@localhost:5433/invoice_agent"
  ),
  minio: {
    endPoint: required("MINIO_ENDPOINT", "localhost"),
    port: Number(process.env.MINIO_PORT ?? 9000),
    accessKey: required("MINIO_ACCESS_KEY", "minioadmin"),
    secretKey: required("MINIO_SECRET_KEY", "minioadmin"),
    bucket: required("MINIO_BUCKET", "invoices"),
    useSSL: process.env.MINIO_USE_SSL === "true",
  },
};
