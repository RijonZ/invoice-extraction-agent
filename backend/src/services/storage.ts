import { Client } from "minio";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

const minioClient = new Client({
  endPoint: env.minio.endPoint,
  port: env.minio.port,
  useSSL: env.minio.useSSL,
  accessKey: env.minio.accessKey,
  secretKey: env.minio.secretKey,
});

let bucketReady: Promise<void> | null = null;

export function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const exists = await minioClient.bucketExists(env.minio.bucket).catch(() => false);
      if (!exists) {
        await minioClient.makeBucket(env.minio.bucket);
      }
    })();
  }
  return bucketReady;
}

export async function uploadInvoiceFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  await ensureBucket();
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "bin";
  const key = `${randomUUID()}.${ext}`;
  await minioClient.putObject(env.minio.bucket, key, buffer, buffer.length, {
    "Content-Type": mimeType,
  });
  return key;
}

export async function getInvoiceFileUrl(key: string): Promise<string> {
  await ensureBucket();
  // 1 hour presigned URL, long enough for a review-dashboard session.
  return minioClient.presignedGetObject(env.minio.bucket, key, 60 * 60);
}
