import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listInvoices } from "../api/client";
import { UploadDropzone } from "../components/UploadDropzone";
import { useLanguage } from "../context/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import type { InvoiceStatus, InvoiceSummary } from "../types/invoice";

const STATUS_FILTERS: Array<{ labelKey: TranslationKey; value: InvoiceStatus | "all" }> = [
  { labelKey: "dashboard.filterAll", value: "all" },
  { labelKey: "common.statusNeedsReview", value: "needs_review" },
  { labelKey: "common.statusApproved", value: "approved" },
  { labelKey: "dashboard.filterProcessing", value: "processing" },
  { labelKey: "common.statusError", value: "error" },
];

function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Dashboard() {
  const { t } = useLanguage();
  const [allInvoices, setAllInvoices] = useState<InvoiceSummary[]>([]);
  const [visibleInvoices, setVisibleInvoices] = useState<InvoiceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");

  const refreshAll = useCallback(() => {
    listInvoices().then(setAllInvoices);
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    setIsLoading(true);
    listInvoices({ status: statusFilter === "all" ? undefined : statusFilter })
      .then(setVisibleInvoices)
      .finally(() => setIsLoading(false));
  }, [statusFilter]);

  const handleUploaded = useCallback(() => {
    refreshAll();
    listInvoices({ status: statusFilter === "all" ? undefined : statusFilter }).then(setVisibleInvoices);
  }, [refreshAll, statusFilter]);

  const counts = {
    processing: allInvoices.filter((i) => i.status === "processing").length,
    needs_review: allInvoices.filter((i) => i.status === "needs_review").length,
    approved: allInvoices.filter((i) => i.status === "approved").length,
    error: allInvoices.filter((i) => i.status === "error").length,
  };

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{t("dashboard.title")}</h1>
          <p className="page-subtitle">{t("dashboard.subtitle")}</p>
        </div>
      </div>

      <UploadDropzone onUploaded={handleUploaded} />

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-card-value">{allInvoices.length}</div>
          <div className="stat-card-label">{t("dashboard.statTotal")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-value">{counts.needs_review}</div>
          <div className="stat-card-label">{t("dashboard.statNeedsReview")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-value">{counts.approved}</div>
          <div className="stat-card-label">{t("dashboard.statApproved")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-value">{counts.error}</div>
          <div className="stat-card-label">{t("dashboard.statError")}</div>
        </div>
      </div>

      <div className="status-filters">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            className={filter.value === statusFilter ? "filter-active" : ""}
            onClick={() => setStatusFilter(filter.value)}
          >
            {t(filter.labelKey)}
          </button>
        ))}
      </div>

      <div className="card table-card">
        {isLoading ? (
          <p className="loading-state">{t("dashboard.loading")}</p>
        ) : visibleInvoices.length === 0 ? (
          <p className="empty-state">
            {allInvoices.length === 0 ? t("dashboard.emptyNoInvoices") : t("dashboard.emptyNoMatch")}
          </p>
        ) : (
          <table className="invoice-table">
            <thead>
              <tr>
                <th>{t("common.colVendor")}</th>
                <th>{t("common.colInvoiceNumber")}</th>
                <th>{t("common.colDate")}</th>
                <th>{t("common.colTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <Link to={`/invoices/${invoice.id}`}>{invoice.vendor_name ?? t("common.unknownVendor")}</Link>
                  </td>
                  <td className={invoice.invoice_number ? "" : "cell-muted"}>
                    {invoice.invoice_number ?? "—"}
                  </td>
                  <td className={invoice.invoice_date ? "" : "cell-muted"}>
                    {invoice.invoice_date ?? "—"}
                  </td>
                  <td className="cell-amount">{formatMoney(invoice.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
