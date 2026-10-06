import { Router } from "express";
import { pool } from "../db/pool.js";

export const statsRouter = Router();

// Personal stats for the signed-in user — scoped by created_by, no admin
// gating needed since every user can only ever see their own numbers.
statsRouter.get("/me/stats", async (req, res) => {
  const userId = req.user?.id;

  // Years the user actually has dated invoices in — drives the year
  // switcher and picks a sane default (the most recent year with data,
  // not necessarily the current calendar year).
  const yearsResult = await pool.query(
    `SELECT DISTINCT EXTRACT(YEAR FROM invoice_date)::int AS year
     FROM invoices WHERE created_by = $1 AND invoice_date IS NOT NULL
     ORDER BY year DESC`,
    [userId]
  );
  const availableYears: number[] = yearsResult.rows.map((r) => r.year);
  const requestedYear = Number(req.query.year);
  const year = availableYears.includes(requestedYear)
    ? requestedYear
    : (availableYears[0] ?? new Date().getFullYear());

  const [totals, statusBreakdown, monthlyUploads] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total_invoices, COALESCE(SUM(total), 0)::float AS total_spend
       FROM invoices WHERE created_by = $1`,
      [userId]
    ),
    pool.query(
      `SELECT status, COUNT(*)::int AS count FROM invoices WHERE created_by = $1 GROUP BY status`,
      [userId]
    ),
    // Grouped by the invoice's own date (when the expense happened), not
    // by created_at (when it was uploaded/re-processed) — those can be
    // years apart for backfilled or re-extracted invoices. generate_series
    // fills in every month of the selected year so the chart always has a
    // full 12-month axis, not just the months with activity.
    pool.query(
      `SELECT to_char(month, 'YYYY-MM') AS month,
              COALESCE(sub.count, 0)::int AS count,
              COALESCE(sub.total, 0)::float AS total
       FROM generate_series(
         make_date($2::int, 1, 1),
         make_date($2::int, 12, 1),
         INTERVAL '1 month'
       ) AS month
       LEFT JOIN (
         SELECT date_trunc('month', invoice_date) AS month, COUNT(*)::int AS count, SUM(total)::float AS total
         FROM invoices
         WHERE created_by = $1 AND invoice_date IS NOT NULL AND EXTRACT(YEAR FROM invoice_date) = $2::int
         GROUP BY 1
       ) sub USING (month)
       ORDER BY month`,
      [userId, year]
    ),
  ]);

  res.json({
    total_invoices: totals.rows[0].total_invoices,
    total_spend: totals.rows[0].total_spend,
    status_breakdown: statusBreakdown.rows,
    monthly_uploads: monthlyUploads.rows,
    available_years: availableYears,
    selected_year: year,
  });
});
