import { Router } from "express";
import { pool } from "../db/pool.js";

export const statsRouter = Router();

// Personal stats for the signed-in user — scoped by created_by, no admin
// gating needed since every user can only ever see their own numbers.
statsRouter.get("/me/stats", async (req, res) => {
  const userId = req.user?.id;

  const [totals, statusBreakdown, monthlyUploads, turnaround] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total_invoices, COALESCE(SUM(total), 0)::float AS total_spend
       FROM invoices WHERE created_by = $1`,
      [userId]
    ),
    pool.query(
      `SELECT status, COUNT(*)::int AS count FROM invoices WHERE created_by = $1 GROUP BY status`,
      [userId]
    ),
    // generate_series fills in every month of the 6-month window (not just
    // months with an upload) so the chart always has a full, comparable axis
    // instead of a lone floating point when only one month has activity.
    pool.query(
      `SELECT to_char(month, 'YYYY-MM') AS month,
              COALESCE(sub.count, 0)::int AS count,
              COALESCE(sub.total, 0)::float AS total
       FROM generate_series(
         date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
         date_trunc('month', CURRENT_DATE),
         INTERVAL '1 month'
       ) AS month
       LEFT JOIN (
         SELECT date_trunc('month', created_at) AS month, COUNT(*)::int AS count, SUM(total)::float AS total
         FROM invoices
         WHERE created_by = $1
         GROUP BY 1
       ) sub USING (month)
       ORDER BY month`,
      [userId]
    ),
    pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600)::float AS avg_hours
       FROM invoices WHERE created_by = $1 AND status = 'approved'`,
      [userId]
    ),
  ]);

  res.json({
    total_invoices: totals.rows[0].total_invoices,
    total_spend: totals.rows[0].total_spend,
    status_breakdown: statusBreakdown.rows,
    monthly_uploads: monthlyUploads.rows,
    avg_turnaround_hours: turnaround.rows[0].avg_hours,
  });
});
