import { useEffect, useState } from "react";
import { getMyStats } from "../api/client";
import { ColumnChart } from "../components/charts/ColumnChart";
import { IconAlertTriangle, IconChart, IconClipboard, IconHistory } from "../components/icons";
import { useLanguage } from "../context/LanguageContext";
import type { MyStats as MyStatsRecord } from "../types/admin";

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function MyStats() {
  const { t } = useLanguage();

  function formatTurnaround(hours: number | null): string {
    if (hours === null) return "—";
    if (hours < 1) return `${Math.round(hours * 60)} ${t("common.min")}`;
    if (hours < 48) return `${hours.toFixed(1)} ${t("common.hrs")}`;
    return `${(hours / 24).toFixed(1)} ${t("common.days")}`;
  }

  const [stats, setStats] = useState<MyStatsRecord | null>(null);

  useEffect(() => {
    getMyStats().then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="page">
        <p className="loading-state">{t("myStats.loading")}</p>
      </div>
    );
  }

  const needsReview = stats.status_breakdown.find((s) => s.status === "needs_review")?.count ?? 0;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthCount = stats.monthly_uploads.find((m) => m.month === thisMonth)?.count ?? 0;

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{t("myStats.title")}</h1>
          <p className="page-subtitle">{t("myStats.subtitle")}</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-card-icon">
            <IconClipboard width={17} height={17} />
          </div>
          <div className="stat-card-value">{stats.total_invoices}</div>
          <div className="stat-card-label">{t("myStats.statTotal")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-green">
            <IconChart width={17} height={17} />
          </div>
          <div className="stat-card-value">{formatMoney(stats.total_spend)}</div>
          <div className="stat-card-label">{t("myStats.statSpend")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-orange">
            <IconAlertTriangle width={17} height={17} />
          </div>
          <div className="stat-card-value">{needsReview}</div>
          <div className="stat-card-label">{t("myStats.statNeedsReview")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-amber">
            <IconHistory width={17} height={17} />
          </div>
          <div className="stat-card-value">{formatTurnaround(stats.avg_turnaround_hours)}</div>
          <div className="stat-card-label">{t("myStats.statAvgReview")}</div>
        </div>
      </div>

      <div className="card analytics-card">
        <h2>{t("myStats.spendPerMonth")}</h2>
        <p className="page-subtitle" style={{ marginBottom: "1rem" }}>
          {t("myStats.purchasesThisMonth", {
            count: thisMonthCount,
            noun: t(thisMonthCount === 1 ? "common.purchaseSingular" : "common.purchasePlural"),
          })}
        </p>
        <ColumnChart
          data={stats.monthly_uploads.map((m) => ({
            label: m.month,
            value: m.total,
            meta:
              m.count > 0
                ? `${m.count} ${t(m.count === 1 ? "common.purchaseSingular" : "common.purchasePlural")}`
                : undefined,
          }))}
          valueFormatter={formatMoney}
        />
      </div>
    </div>
  );
}
