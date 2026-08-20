import { Router } from "express";
import multer from "multer";
import { pool } from "../db/pool.js";
import { processInvoice } from "../services/orchestrator.js";
import { uploadInvoiceFile } from "../services/storage.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const uploadRouter = Router();

uploadRouter.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided (expected multipart field 'file')" });
    return;
  }

  const { buffer, originalname, mimetype } = req.file;
  const fileKey = await uploadInvoiceFile(buffer, originalname, mimetype);

  const inserted = await pool.query(
    `INSERT INTO invoices (file_key, mime_type, status) VALUES ($1, $2, 'processing') RETURNING id`,
    [fileKey, mimetype]
  );
  const invoiceId = inserted.rows[0].id as string;

  // MVP: process inline so the response reflects the final status. A queue
  // (BullMQ, SQS, etc.) is the natural next step once volume grows.
  await processInvoice(invoiceId, buffer, mimetype);

  const result = await pool.query("SELECT * FROM invoices WHERE id = $1", [invoiceId]);
  res.status(201).json(result.rows[0]);
});
