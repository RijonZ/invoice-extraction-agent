import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listInvoices } from "../api/client";
import { IconCheckCircle, IconClipboard, IconCreditCard, IconTrendUp } from "../components/icons";
import { Pagination } from "../components/Pagination";
import { useLanguage } from "../context/LanguageContext";
import { usePagination } from "../hooks/usePagination";
import type { InvoiceSummary } from "../types/invoice";

type DropdownKey = "invoice" | "client" | "vendor";

function formatMoney(value: number): string {
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PaymentSummary() {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listInvoices().then((data) => {
      setInvoices(data);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!openDropdown) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  // Invoice numbers aren't sortable as text (formats vary wildly — "1052",
  // "HWQBG2TW-0004", "01/2026") and listing every single one doesn't scale
  // once there are hundreds of invoices. The filter is really "pick a year"
  // under the hood, so the dropdown lists distinct years instead — bounded
  // by how many years the business has been invoicing, not invoice count.
  const yearOptions = useMemo(() => {
    const years = new Set(
      invoices.filter((i) => i.invoice_date).map((i) => Number(i.invoice_date!.slice(0, 4)))
    );
    return Array.from(years).sort((a, b) => a - b);
  }, [invoices]);

  const clientOptions = useMemo(() => {
    const values = new Set(invoices.map((i) => i.client_name).filter((v): v is string => !!v));
    const sorted = Array.from(values).sort((a, b) => a.localeCompare(b));
    if (!clientSearch) return sorted;
    const needle = clientSearch.toLowerCase();
    return sorted.filter((name) => name.toLowerCase().includes(needle));
  }, [invoices, clientSearch]);

  const vendorOptions = useMemo(() => {
    const values = new Set(invoices.map((i) => i.vendor_name).filter((v): v is string => !!v));
    const sorted = Array.from(values).sort((a, b) => a.localeCompare(b));
    if (!vendorSearch) return sorted;
    const needle = vendorSearch.toLowerCase();
    return sorted.filter((name) => name.toLowerCase().includes(needle));
  }, [invoices, vendorSearch]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      if (yearFilter !== null) {
        if (!invoice.invoice_date || Number(invoice.invoice_date.slice(0, 4)) !== yearFilter) return false;
      }
      if (clientFilter && invoice.client_name !== clientFilter) return false;
      if (vendorFilter && invoice.vendor_name !== vendorFilter) return false;
      if (fromDate && (!invoice.invoice_date || invoice.invoice_date < fromDate)) return false;
      if (toDate && (!invoice.invoice_date || invoice.invoice_date > toDate)) return false;
      return true;
    });
  }, [invoices, yearFilter, clientFilter, vendorFilter, fromDate, toDate]);

  const { pageItems, page, totalPages, next, prev } = usePagination(filteredInvoices);

  // Sums across every filtered invoice (not just the current page). The stat
  // cards, the comparison bar, and the table's totals row all read from this
  // same memo, so narrowing to e.g. one client updates all three in sync —
  // with no filter active it equals the company-wide totals.
  const filteredTotals = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, invoice) => {
        const total = invoice.total !== null ? Number(invoice.total) : 0;
        const paid = Number(invoice.amount_paid ?? 0);
        acc.total += total;
        acc.paid += paid;
        acc.remaining += Math.max(total - paid, 0);
        return acc;
      },
      { total: 0, paid: 0, remaining: 0 }
    );
  }, [filteredInvoices]);

  const hasActiveFilters = yearFilter !== null || clientFilter !== null || vendorFilter !== null || fromDate || toDate;

  const clearFilters = () => {
    setYearFilter(null);
    setClientFilter(null);
    setVendorFilter(null);
    setFromDate("");
    setToDate("");
  };

  const toggleDropdown = (key: DropdownKey) => {
    setOpenDropdown((current) => (current === key ? null : key));
    setClientSearch("");
    setVendorSearch("");
  };

  if (!loaded) {
    return (
      <div className="page">
        <p className="loading-state">{t("paymentSummary.loading")}</p>
      </div>
    );
  }

  const paidPct = filteredTotals.total > 0 ? Math.min((filteredTotals.paid / filteredTotals.total) * 100, 100) : 0;
  const remainingPct = 100 - paidPct;

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{t("paymentSummary.title")}</h1>
          <p className="page-subtitle">{t("paymentSummary.subtitle")}</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-card-icon">
            <IconClipboard width={17} height={17} />
          </div>
          <div className="stat-card-value">{filteredInvoices.length}</div>
          <div className="stat-card-label">{t("paymentSummary.statCount")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-amber">
            <IconTrendUp width={17} height={17} />
          </div>
          <div className="stat-card-value">{formatMoney(filteredTotals.total)}</div>
          <div className="stat-card-label">{t("paymentSummary.statInvoiced")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-green">
            <IconCheckCircle width={17} height={17} />
          </div>
          <div className="stat-card-value">{formatMoney(filteredTotals.paid)}</div>
          <div className="stat-card-label">{t("paymentSummary.statPaid")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-orange">
            <IconCreditCard width={17} height={17} />
          </div>
          <div className="stat-card-value">{formatMoney(filteredTotals.remaining)}</div>
          <div className="stat-card-label">{t("paymentSummary.statRemaining")}</div>
        </div>
      </div>

      <div className="card analytics-card payment-summary-compare-card">
        <h2>{t("paymentSummary.comparisonTitle")}</h2>
        <div className="payment-compare-track">
          <div className="payment-compare-segment-paid" style={{ width: `${paidPct}%` }} />
          <div className="payment-compare-segment-remaining" style={{ width: `${remainingPct}%` }} />
        </div>
        <div className="payment-compare-legend">
          <span className="payment-compare-legend-item">
            <span className="payment-compare-dot payment-compare-dot-paid" />
            {t("paymentSummary.paidLabel")} · {formatMoney(filteredTotals.paid)}
          </span>
          <span className="payment-compare-legend-item">
            <span className="payment-compare-dot payment-compare-dot-remaining" />
            {t("paymentSummary.remainingLabel")} · {formatMoney(filteredTotals.remaining)}
          </span>
        </div>
      </div>

      <div className="filter-bar" ref={dropdownRef}>
        <div className="filter-dropdown-anchor">
          <div className={`filter-dropdown-trigger${yearFilter !== null ? " filter-dropdown-trigger-active" : ""}`}>
            <button className="filter-dropdown-trigger-label" onClick={() => toggleDropdown("invoice")}>
              {t("common.colInvoiceNumber")}
              {yearFilter !== null ? ` · ${yearFilter}` : ""}
            </button>
            {yearFilter !== null && (
              <button
                type="button"
                className="filter-dropdown-trigger-clear"
                aria-label={t("dashboard.clearFilters")}
                onClick={(e) => {
                  e.stopPropagation();
                  setYearFilter(null);
                }}
              >
                ×
              </button>
            )}
          </div>
          {openDropdown === "invoice" && (
            <div className="filter-dropdown-panel">
              {yearOptions.length === 0 ? (
                <p className="filter-dropdown-empty">{t("paymentSummary.noOptions")}</p>
              ) : (
                yearOptions.map((year) => (
                  <button
                    key={year}
                    className={`filter-dropdown-option${yearFilter === year ? " filter-dropdown-option-active" : ""}`}
                    onClick={() => {
                      setYearFilter(year);
                      setOpenDropdown(null);
                    }}
                  >
                    {year}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="filter-dropdown-anchor">
          <div className={`filter-dropdown-trigger${clientFilter ? " filter-dropdown-trigger-active" : ""}`}>
            <button className="filter-dropdown-trigger-label" onClick={() => toggleDropdown("client")}>
              {t("common.colClient")}
              {clientFilter ? ` · ${clientFilter}` : ""}
            </button>
            {clientFilter && (
              <button
                type="button"
                className="filter-dropdown-trigger-clear"
                aria-label={t("dashboard.clearFilters")}
                onClick={(e) => {
                  e.stopPropagation();
                  setClientFilter(null);
                }}
              >
                ×
              </button>
            )}
          </div>
          {openDropdown === "client" && (
            <div className="filter-dropdown-panel">
              <input
                autoFocus
                type="text"
                className="filter-dropdown-search"
                placeholder={t("paymentSummary.searchOptionsPlaceholder")}
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
              {clientOptions.length === 0 ? (
                <p className="filter-dropdown-empty">{t("paymentSummary.noOptions")}</p>
              ) : (
                clientOptions.map((name) => (
                  <button
                    key={name}
                    className={`filter-dropdown-option${clientFilter === name ? " filter-dropdown-option-active" : ""}`}
                    onClick={() => {
                      setClientFilter(name);
                      setOpenDropdown(null);
                    }}
                  >
                    {name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="filter-dropdown-anchor">
          <div className={`filter-dropdown-trigger${vendorFilter ? " filter-dropdown-trigger-active" : ""}`}>
            <button className="filter-dropdown-trigger-label" onClick={() => toggleDropdown("vendor")}>
              {t("common.colVendor")}
              {vendorFilter ? ` · ${vendorFilter}` : ""}
            </button>
            {vendorFilter && (
              <button
                type="button"
                className="filter-dropdown-trigger-clear"
                aria-label={t("dashboard.clearFilters")}
                onClick={(e) => {
                  e.stopPropagation();
                  setVendorFilter(null);
                }}
              >
                ×
              </button>
            )}
          </div>
          {openDropdown === "vendor" && (
            <div className="filter-dropdown-panel">
              <input
                autoFocus
                type="text"
                className="filter-dropdown-search"
                placeholder={t("paymentSummary.searchOptionsPlaceholder")}
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
              />
              {vendorOptions.length === 0 ? (
                <p className="filter-dropdown-empty">{t("paymentSummary.noOptions")}</p>
              ) : (
                vendorOptions.map((name) => (
                  <button
                    key={name}
                    className={`filter-dropdown-option${vendorFilter === name ? " filter-dropdown-option-active" : ""}`}
                    onClick={() => {
                      setVendorFilter(name);
                      setOpenDropdown(null);
                    }}
                  >
                    {name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

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
          <button className="inline-action" onClick={clearFilters}>
            {t("dashboard.clearFilters")}
          </button>
        )}
      </div>

      <div className="card table-card">
        {filteredInvoices.length === 0 ? (
          <p className="empty-state">
            {invoices.length === 0 ? t("dashboard.emptyNoInvoices") : t("dashboard.emptyNoMatch")}
          </p>
        ) : (
          <>
            <table className="invoice-table payment-summary-table">
              <thead>
                <tr>
                  <th>{t("common.colVendor")}</th>
                  <th>{t("common.colClient")}</th>
                  <th>{t("common.colInvoiceNumber")}</th>
                  <th>{t("common.colDate")}</th>
                  <th>{t("common.colTotal")}</th>
                  <th>{t("paymentSummary.paidLabel")}</th>
                  <th>{t("paymentSummary.remainingLabel")}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((invoice) => {
                  const total = invoice.total !== null ? Number(invoice.total) : null;
                  const paid = Number(invoice.amount_paid ?? 0);
                  const remaining = total !== null ? Math.max(total - paid, 0) : null;
                  const isSettled = remaining !== null && remaining <= 0;
                  return (
                    <tr key={invoice.id}>
                      <td>
                        <Link to={`/invoices/${invoice.id}`}>{invoice.vendor_name ?? t("common.unknownVendor")}</Link>
                      </td>
                      <td className={invoice.client_name ? "" : "cell-muted"}>{invoice.client_name ?? "—"}</td>
                      <td className={invoice.invoice_number ? "" : "cell-muted"}>
                        {invoice.invoice_number ?? "—"}
                      </td>
                      <td className={invoice.invoice_date ? "" : "cell-muted"}>{invoice.invoice_date ?? "—"}</td>
                      <td className="cell-amount">{total !== null ? formatMoney(total) : "—"}</td>
                      <td className="cell-amount payment-summary-cell-paid">{formatMoney(paid)}</td>
                      <td
                        className={`cell-amount ${isSettled ? "payment-summary-cell-settled" : "payment-summary-cell-owed"}`}
                      >
                        {remaining !== null ? formatMoney(remaining) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="payment-summary-totals-row">
                  <td colSpan={4}>
                    {t("paymentSummary.filteredTotalLabel")}
                    {hasActiveFilters ? ` (${t("paymentSummary.filteredLabel")})` : ""}
                  </td>
                  <td className="cell-amount">{formatMoney(filteredTotals.total)}</td>
                  <td className="cell-amount payment-summary-cell-paid">{formatMoney(filteredTotals.paid)}</td>
                  <td
                    className={`cell-amount ${filteredTotals.remaining <= 0 ? "payment-summary-cell-settled" : "payment-summary-cell-owed"}`}
                  >
                    {formatMoney(filteredTotals.remaining)}
                  </td>
                </tr>
              </tfoot>
            </table>
            <Pagination page={page} totalPages={totalPages} onPrev={prev} onNext={next} />
          </>
        )}
      </div>
    </div>
  );
}
