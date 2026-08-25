import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAdmin } from "../middleware/auth.js";

export const analyticsRouter = Router();

// requireAdmin is per-route, not router-level — see the comment in
// routes/vendors.ts for why an unconditional router.use() here would
// incorrectly gate unrelated paths mounted after this router.
analyticsRouter.get("/analytics/summary", requireAdmin, async (_req, res) => {
  const [monthlySpend, topVendors, statusBreakdown, correctionFrequency, spendByCategory] = await Promise.all([
    // generate_series fills in every month of the 12-month window (not just
    // months with spend) so the chart always has a full, comparable axis
    // instead of gaps where a month had zero activity.
    pool.query(
      `SELECT to_char(month, 'YYYY-MM') AS month,
              COALESCE(sub.total, 0)::float AS total,
              COALESCE(sub.count, 0)::int AS count
       FROM generate_series(
         date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
         date_trunc('month', CURRENT_DATE),
         INTERVAL '1 month'
       ) AS month
       LEFT JOIN (
         SELECT date_trunc('month', COALESCE(invoice_date, created_at::date)) AS month,
                SUM(total)::float AS total,
                COUNT(*)::int AS count
         FROM invoices
         GROUP BY 1
       ) sub USING (month)
       ORDER BY month`
    ),
    pool.query(
      `SELECT v.id, v.name, COUNT(i.id)::int AS invoice_count,
              COALESCE(SUM(i.total), 0)::float AS total_spend
       FROM vendors v
       JOIN invoices i ON i.vendor_id = v.id
       GROUP BY v.id
       ORDER BY total_spend DESC
       LIMIT 5`
    ),
    pool.query(`SELECT status, COUNT(*)::int AS count FROM invoices GROUP BY status`),
    pool.query(
      `SELECT field_name, COUNT(*)::int AS count FROM extraction_feedback
       GROUP BY field_name ORDER BY count DESC`
    ),
    pool.query(
      `SELECT COALESCE(c.name, 'Uncategorized') AS category_name,
              COALESCE(SUM(i.total), 0)::float AS total_spend
       FROM invoices i
       LEFT JOIN categories c ON c.id = i.category_id
       GROUP BY c.name
       ORDER BY total_spend DESC`
    ),
  ]);

  res.json({
    monthly_spend: monthlySpend.rows,
    top_vendors: topVendors.rows,
    status_breakdown: statusBreakdown.rows,
    correction_frequency: correctionFrequency.rows,
    spend_by_category: spendByCategory.rows,
  });
});
