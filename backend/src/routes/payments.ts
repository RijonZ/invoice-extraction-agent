import { Router } from "express";
import { pool } from "../db/pool.js";

export const paymentsRouter = Router();

// Accounts-payable snapshot — admins see the company-wide picture, everyone
// else sees only what they're responsible for, same ownership rule as
// GET /invoices.
paymentsRouter.get("/payments/summary", async (req, res) => {
  const isAdmin = req.user?.role === "admin";
  const params: unknown[] = [];
  let where = "";
  if (!isAdmin) {
    params.push(req.user?.id);
    where = `WHERE created_by = $${params.length}`;
  }

  const result = await pool.query(
    `SELECT
       COALESCE(SUM(total - amount_paid) FILTER (WHERE payment_status IN ('unpaid', 'partial')), 0)::float AS total_outstanding,
       COUNT(*) FILTER (
         WHERE payment_status IN ('unpaid', 'partial') AND due_date IS NOT NULL AND due_date < CURRENT_DATE
       )::int AS overdue_count,
       COALESCE(SUM(total - amount_paid) FILTER (
         WHERE payment_status IN ('unpaid', 'partial') AND due_date IS NOT NULL AND due_date < CURRENT_DATE
       ), 0)::float AS overdue_total,
       COUNT(*) FILTER (WHERE payment_status = 'partial')::int AS partial_count,
       COALESCE(SUM(total - amount_paid) FILTER (WHERE payment_status = 'partial'), 0)::float AS partial_total
     FROM invoices
     ${where}`,
    params
  );
  res.json(result.rows[0]);
});
