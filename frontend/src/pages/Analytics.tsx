import { useEffect, useState } from "react";
import { getAnalyticsSummary } from "../api/client";
import { BarRanking } from "../components/charts/BarRanking";
import { ColumnChart } from "../components/charts/ColumnChart";
import { IconAlertTriangle, IconBuilding, IconChart, IconClipboard } from "../components/icons";
import { useLanguage } from "../context/LanguageContext";
import { translateCategoryName } from "../i18n/categoryNames";
import type { TranslationKey } from "../i18n/translations";
import type { AnalyticsSummary } from "../types/admin";
import type { InvoiceStatus } from "../types/invoice";

const STATUS_ORDER: InvoiceStatus[] = ["processing", "needs_review", "approved", "error"];
const STATUS_LABEL_KEYS: Record<InvoiceStatus, TranslationKey> = {
  processing: "common.statusProcessing",
  needs_review: "common.statusNeedsReview",
  approved: "common.statusApproved",
  error: "common.statusError",
};

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function Analytics() {
  const { t, language } = useLanguage();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    getAnalyticsSummary().then(setSummary);
  }, []);

  if (!summary) {
    return (
      <div className="page">
        <p className="loading-state">{t("analytics.loading")}</p>
      </div>
    );
  }

  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: summary.status_breakdown.find((s) => s.status === status)?.count ?? 0,
  }));
  const statusMax = Math.max(...statusCounts.map((s) => s.count), 1);

  const totalInvoices = statusCounts.reduce((sum, s) => sum + s.count, 0);
  const totalSpend12mo = summary.monthly_spend.reduce((sum, m) => sum + m.total, 0);
  const needsReview = statusCounts.find((s) => s.status === "needs_review")?.count ?? 0;
  const correctionsLogged = summary.correction_frequency.reduce((sum, f) => sum + f.count, 0);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{t("analytics.title")}</h1>
          <p className="page-subtitle">{t("analytics.subtitle")}</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-card-icon">
            <IconClipboard width={17} height={17} />
          </div>
          <div className="stat-card-value">{totalInvoices}</div>
          <div className="stat-card-label">{t("analytics.statTotal")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-green">
            <IconChart width={17} height={17} />
          </div>
          <div className="stat-card-value">{formatMoney(totalSpend12mo)}</div>
          <div className="stat-card-label">{t("analytics.statSpend12mo")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-orange">
            <IconAlertTriangle width={17} height={17} />
          </div>
          <div className="stat-card-value">{needsReview}</div>
          <div className="stat-card-label">{t("analytics.statNeedsReview")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-amber">
            <IconBuilding width={17} height={17} />
          </div>
          <div className="stat-card-value">{correctionsLogged}</div>
          <div className="stat-card-label">{t("analytics.statCorrections")}</div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="card analytics-card analytics-card-wide">
          <h2>{t("analytics.monthlySpend")}</h2>
          <ColumnChart
            data={summary.monthly_spend.map((m) => ({
              label: m.month,
              value: m.total,
              meta:
                m.count > 0
                  ? `${m.count} ${m.count === 1 ? t("common.invoiceSingular") : t("common.invoicePlural")}`
                  : undefined,
            }))}
            valueFormatter={formatMoney}
          />
        </div>

        <div className="card analytics-card">
          <h2>{t("analytics.invoiceStatus")}</h2>
          <div className="bar-ranking">
            {statusCounts.map((s) => (
              <div className="bar-ranking-row" key={s.status}>
                <span className="bar-ranking-label">{t(STATUS_LABEL_KEYS[s.status])}</span>
                <div className="bar-ranking-track">
                  <div
                    className={`bar-ranking-fill status-fill-${s.status}`}
                    style={{ width: `${Math.max((s.count / statusMax) * 100, 3)}%` }}
                    title={`${t(STATUS_LABEL_KEYS[s.status])}: ${s.count}`}
                  />
                </div>
                <span className="bar-ranking-value">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card analytics-card">
          <h2>{t("analytics.topVendors")}</h2>
          <BarRanking
            data={summary.top_vendors.map((v) => ({ label: v.name, value: v.total_spend }))}
            valueFormatter={formatMoney}
          />
        </div>

        <div className="card analytics-card">
          <h2>{t("analytics.spendByCategory")}</h2>
          {summary.spend_by_category.length === 0 ? (
            <p className="empty-state">{t("analytics.emptySpend")}</p>
          ) : (
            <BarRanking
              data={summary.spend_by_category.map((c) => ({
                label: translateCategoryName(c.category_name, language),
                value: c.total_spend,
              }))}
              valueFormatter={formatMoney}
            />
          )}
        </div>

        <div className="card analytics-card">
          <h2>{t("analytics.fieldsCorrected")}</h2>
          <p className="page-subtitle" style={{ marginBottom: "1rem" }}>
            {t("analytics.fieldsCorrectedHint")}
          </p>
          {summary.correction_frequency.length === 0 ? (
            <p className="empty-state">{t("analytics.emptyCorrections")}</p>
          ) : (
            <BarRanking
              data={summary.correction_frequency.map((f) => ({
                label: f.field_name,
                value: f.count,
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
