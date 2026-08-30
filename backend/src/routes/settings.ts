import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";
import { getPublicSettings, getSettings, updateSettings } from "../services/settings.js";

export const settingsRouter = Router();

// Any signed-in user can read the public subset (brand name + banner) — no
// requireAdmin here, unlike the two routes below.
settingsRouter.get("/settings/public", async (_req, res) => {
  res.json(await getPublicSettings());
});

settingsRouter.get("/admin/settings", requireAdmin, async (_req, res) => {
  res.json(await getSettings());
});

settingsRouter.patch("/admin/settings", requireAdmin, async (req, res) => {
  const { extraction_model, amount_tolerance, company_name, max_extraction_attempts, default_currency, banner_message } =
    req.body ?? {};
  const changes: Record<string, unknown> = {};

  if (extraction_model !== undefined) {
    if (typeof extraction_model !== "string" || !extraction_model.trim()) {
      res.status(400).json({ error: "extraction_model must be a non-empty string" });
      return;
    }
    changes.extraction_model = extraction_model.trim();
  }
  if (amount_tolerance !== undefined) {
    if (typeof amount_tolerance !== "number" || amount_tolerance < 0) {
      res.status(400).json({ error: "amount_tolerance must be a non-negative number" });
      return;
    }
    changes.amount_tolerance = amount_tolerance;
  }
  if (company_name !== undefined) {
    if (typeof company_name !== "string" || !company_name.trim()) {
      res.status(400).json({ error: "company_name must be a non-empty string" });
      return;
    }
    changes.company_name = company_name.trim();
  }
  if (max_extraction_attempts !== undefined) {
    if (
      typeof max_extraction_attempts !== "number" ||
      !Number.isInteger(max_extraction_attempts) ||
      max_extraction_attempts < 1 ||
      max_extraction_attempts > 10
    ) {
      res.status(400).json({ error: "max_extraction_attempts must be a whole number between 1 and 10" });
      return;
    }
    changes.max_extraction_attempts = max_extraction_attempts;
  }
  if (default_currency !== undefined) {
    if (typeof default_currency !== "string" || !default_currency.trim()) {
      res.status(400).json({ error: "default_currency must be a non-empty string" });
      return;
    }
    changes.default_currency = default_currency.trim();
  }
  if (banner_message !== undefined) {
    if (banner_message !== null && typeof banner_message !== "string") {
      res.status(400).json({ error: "banner_message must be a string or null" });
      return;
    }
    changes.banner_message = banner_message;
  }

  const updated = await updateSettings(changes);
  await logAudit(req.user?.id ?? null, "settings.update", "settings", null, { ...updated });
  res.json(updated);
});
