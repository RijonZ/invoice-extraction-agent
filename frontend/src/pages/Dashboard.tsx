import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EXPORT_CSV_URL, listInvoices } from "../api/client";
import { UploadDropzone } from "../components/UploadDropzone";
import { useLanguage } from "../context/LanguageContext";
import { translateCategoryName } from "../i18n/categoryNames";
import type { TranslationKey } from "../i18n/translations";
import type { InvoiceStatus, InvoiceSummary } from "../types/invoice";

const STATUS_FILTERS: Array<{ labelKey: TranslationKey; value: InvoiceStatus | "all" }> = [
  { labelKey: "dashboard.filterAll", value: "all" },
  { labelKey: "common.statusNeedsReview", value: "needs_review" },
  { labelKey: "common.statusApproved", value: "approved" },
  { labelKey: "dashboard.filterProcessing", value: "processing" },
  { labelKey: "common.statusError", value: "error" },
];

const SEARCH_DEBOUNCE_MS = 300;

function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isOverdue(invoice: InvoiceSummary): boolean {
  if (!invoice.due_date || invoice.payment_status === "paid") return false;
  return invoice.due_date < new Date().toISOString().slice(0, 10);
}

export function Dashboard() {
  const { t, language } = useLanguage();
  const [allInvoices, setAllInvoices] = useState<InvoiceSummary[]>([]);
  const [visibleInvoices, setVisibleInvoices] = useState<InvoiceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const refreshAll = useCallback(() => {
    listInvoices().then(setAllInvoices);
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    setIsLoading(true);
    listInvoices({
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    })
      .then(setVisibleInvoices)
      .finally(() => setIsLoading(false));
  }, [statusFilter, search, fromDate, toDate]);

  const handleUploaded = useCallback(() => {
    refreshAll();
    listInvoices({
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    }).then(setVisibleInvoices);
  }, [refreshAll, statusFilter, search, fromDate, toDate]);

  const counts = useMemo(() => {
    const base: Record<InvoiceStatus, number> = {
      processing: 0,
      needs_review: 0,
      approved: 0,
      error: 0,
    };
    for (const invoice of allInvoices) base[invoice.status]++;
    return base;
  }, [allInvoices]);

  const hasActiveFilters = search || fromDate || toDate || statusFilter !== "all";

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{t("dashboard.title")}</h1>
          <p className="page-subtitle">{t("dashboard.subtitle")}</p>
        </div>
        <a className="export-link" href={EXPORT_CSV_URL} download="invoices.csv">
          {t("dashboard.exportCsv")}
        </a>
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

      <div className="filter-bar">
        <input
          className="search-input"
          type="search"
          placeholder={t("dashboard.searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          aria-label={t("dashboard.fromDateAria")}
        />
        <span className="filter-bar-sep">{t("dashboard.filterSep")}</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          aria-label={t("dashboard.toDateAria")}
        />
        {hasActiveFilters && (
          <button
            className="inline-action"
            onClick={() => {
              setStatusFilter("all");
              setSearchInput("");
              setFromDate("");
              setToDate("");
            }}
          >
            {t("dashboard.clearFilters")}
          </button>
        )}
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
                <th>{t("invoiceDetail.category")}</th>
                <th>{t("common.colPayment")}</th>
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
                  <td className={invoice.category_name ? "" : "cell-muted"}>
                    {invoice.category_name ? translateCategoryName(invoice.category_name, language) : t("common.uncategorized")}
                  </td>
                  <td>
                    <span
                      className={`status-badge status-${
                        isOverdue(invoice)
                          ? "error"
                          : invoice.payment_status === "paid"
                            ? "approved"
                            : invoice.payment_status === "partial"
                              ? "needs_review"
                              : "processing"
                      }`}
                    >
                      {isOverdue(invoice)
                        ? t("common.overdue")
                        : invoice.payment_status === "paid"
                          ? t("common.paid")
                          : invoice.payment_status === "partial"
                            ? t("common.partial")
                            : t("common.unpaid")}
                    </span>
                    {invoice.payment_status === "partial" && invoice.total !== null && Number(invoice.total) > 0 && (
                      <div className="amount-progress">
                        <span className="amount-progress-label">
                          <span className="amount-progress-paid">{formatMoney(invoice.amount_paid)}</span>{" "}
                          <span className="amount-progress-total">
                            {t("payments.amountPaidOf", { total: formatMoney(invoice.total) })}
                          </span>
                        </span>
                        <div className="amount-progress-track">
                          <div
                            className="amount-progress-fill"
                            style={{ width: `${Math.min((Number(invoice.amount_paid) / Number(invoice.total)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
