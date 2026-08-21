import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { invoicesRouter } from "./routes/invoices.js";
import { uploadRouter } from "./routes/upload.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Public: register/login/logout. /auth/me applies requireAuth itself.
app.use(authRouter);

// Everything mounted below this line requires a valid session; the
// admin-only routers additionally self-apply requireAdmin.
app.use(requireAuth);

app.use(uploadRouter);
app.use(invoicesRouter);

app.listen(env.port, () => {
  console.log(`invoice-extraction backend listening on :${env.port}`);
});
