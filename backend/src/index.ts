import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { invoicesRouter } from "./routes/invoices.js";
import { uploadRouter } from "./routes/upload.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(uploadRouter);
app.use(invoicesRouter);

app.listen(env.port, () => {
  console.log(`invoice-extraction backend listening on :${env.port}`);
});
