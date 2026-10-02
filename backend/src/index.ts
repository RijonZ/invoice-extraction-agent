import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.js";
import { analyticsRouter } from "./routes/analytics.js";
import { auditRouter } from "./routes/audit.js";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { invoicesRouter } from "./routes/invoices.js";
import { notificationsRouter } from "./routes/notifications.js";
import { paymentsRouter } from "./routes/payments.js";
import { settingsRouter } from "./routes/settings.js";
import { statsRouter } from "./routes/stats.js";
import { uploadRouter } from "./routes/upload.js";
import { usersRouter } from "./routes/users.js";
import { vendorsRouter } from "./routes/vendors.js";

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
app.use(notificationsRouter);
app.use(vendorsRouter);
app.use(analyticsRouter);
app.use(usersRouter);
app.use(auditRouter);
app.use(settingsRouter);
app.use(statsRouter);
app.use(categoriesRouter);
app.use(paymentsRouter);

app.listen(env.port, () => {
  console.log(`invoice-extraction backend listening on :${env.port}`);
});
