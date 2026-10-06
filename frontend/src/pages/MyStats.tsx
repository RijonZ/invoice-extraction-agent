import { useEffect, useState } from "react";
import { getMyStats } from "../api/client";
import { ColumnChart } from "../components/charts/ColumnChart";
import {
  IconChart,
  IconCheckCircle,
  IconChevronLeft,
  IconChevronRight,
  IconClipboard,
  IconTrendUp,
} from "../components/icons";
import { useLanguage } from "../context/LanguageContext";
import type { MyStats as MyStatsRecord } from "../types/admin";

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function MyStats() {
  const { t } = useLanguage();

  const [stats, setStats] = useState<MyStatsRecord | null>(null);
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    getMyStats(year ?? undefined).then((data) => {
      setStats(data);
      setYear(data.selected_year);
    });
  }, [year]);

  if (!stats) {
    return (
      <div className="page">
        <p className="loading-state">{t("myStats.loading")}</p>
      </div>
    );
  }

  const approved = stats.status_breakdown.find((s) => s.status === "approved")?.count ?? 0;
  const avgPerInvoice = stats.total_invoices > 0 ? stats.total_spend / stats.total_invoices : 0;

  // available_years is sorted newest-first, so index 0 is the most recent
  // year with data and the last index is the oldest.
  const years = stats.available_years;
  const yearIndex = years.indexOf(stats.selected_year);
  const canGoNewer = yearIndex > 0;
  const canGoOlder = yearIndex !== -1 && yearIndex < years.length - 1;

  const yearTotal = stats.monthly_uploads.reduce((sum, m) => sum + m.count, 0);

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
          <div className="stat-card-icon stat-card-icon-green">
            <IconCheckCircle width={17} height={17} />
          </div>
          <div className="stat-card-value">{approved}</div>
          <div className="stat-card-label">{t("myStats.statApproved")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-amber">
            <IconTrendUp width={17} height={17} />
          </div>
          <div className="stat-card-value">{formatMoney(avgPerInvoice)}</div>
          <div className="stat-card-label">{t("myStats.statAvgPerInvoice")}</div>
        </div>
      </div>

      <div className="card analytics-card">
        <div className="chart-header-row">
          <h2>{t("myStats.spendPerMonth")}</h2>
          <div className="year-switcher">
            <button
              type="button"
              className="year-switcher-btn"
              aria-label={t("myStats.prevYearAria")}
              disabled={!canGoOlder}
              onClick={() => setYear(years[yearIndex + 1])}
            >
              <IconChevronLeft width={15} height={15} />
            </button>
            <span className="year-switcher-value">{stats.selected_year}</span>
            <button
              type="button"
              className="year-switcher-btn"
              aria-label={t("myStats.nextYearAria")}
              disabled={!canGoNewer}
              onClick={() => setYear(years[yearIndex - 1])}
            >
              <IconChevronRight width={15} height={15} />
            </button>
          </div>
        </div>
        <p className="page-subtitle" style={{ marginBottom: "1rem" }}>
          {t("myStats.purchasesInYear", {
            count: yearTotal,
            year: stats.selected_year,
            noun: t(yearTotal === 1 ? "common.purchaseSingular" : "common.purchasePlural"),
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
