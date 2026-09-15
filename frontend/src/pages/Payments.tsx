import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { getPaymentsSummary, listCategories, listInvoices, setInvoiceCategory, updateInvoicePayment } from "../api/client";
import { IconAlertTriangle, IconClipboard, IconCreditCard } from "../components/icons";
import { Pagination } from "../components/Pagination";
import { useLanguage } from "../context/LanguageContext";
import { usePagination } from "../hooks/usePagination";
import { translateCategoryName } from "../i18n/categoryNames";
import type { TranslationKey } from "../i18n/translations";
import type { Category, PaymentsSummary } from "../types/admin";
import type { InvoiceSummary } from "../types/invoice";

type FilterValue = "unpaid" | "partial" | "overdue" | "paid";

const FILTERS: Array<{ labelKey: TranslationKey; value: FilterValue }> = [
  { labelKey: "payments.filterUnpaid", value: "unpaid" },
  { labelKey: "payments.filterPartial", value: "partial" },
  { labelKey: "payments.filterOverdue", value: "overdue" },
  { labelKey: "payments.filterPaid", value: "paid" },
];

const EMPTY_KEYS: Record<FilterValue, TranslationKey> = {
  unpaid: "payments.emptyUnpaid",
  partial: "payments.emptyPartial",
  overdue: "payments.emptyOverdue",
  paid: "payments.emptyPaid",
};

function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isOverdue(invoice: InvoiceSummary): boolean {
  if (!invoice.due_date || invoice.payment_status === "paid") return false;
  return invoice.due_date < new Date().toISOString().slice(0, 10);
}

export function Payments() {
  const { t, language } = useLanguage();
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<FilterValue>("unpaid");
  const [isLoading, setIsLoading] = useState(true);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [openPartialId, setOpenPartialId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    getPaymentsSummary().then(setSummary);
    setIsLoading(true);
    const filters = filter === "overdue" ? { overdue: true } : { payment_status: filter };
    listInvoices(filters)
      .then(setInvoices)
      .finally(() => setIsLoading(false));
  }, [filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    listCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (!openPartialId) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPartialId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openPartialId]);

  const { pageItems, page, totalPages, next, prev } = usePagination(invoices);

  // Patches the row in place instead of refetching the (filtered) list, so
  // switching to "Partial" doesn't yank the row out from under the user
  // before they've had a chance to type an amount — the current filter tab
  // catches up to the real state next time it's fetched (filter change or
  // amount commit), not on every keystroke-adjacent click.
  const patchInvoiceLocally = (invoiceId: string, changes: Partial<InvoiceSummary>) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? { ...inv, ...changes } : inv)));
  };

  const setPaymentStatus = async (invoice: InvoiceSummary, status: "unpaid" | "paid") => {
    await updateInvoicePayment(invoice.id, { payment_status: status });
    setOpenPartialId(null);
    refresh();
  };

  const openPartialPopover = (invoice: InvoiceSummary, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = Math.min(230, window.innerWidth - 32);
    const left = Math.max(16, Math.min(rect.left, window.innerWidth - popoverWidth - 16));
    setPopoverPos({ top: rect.bottom + 8, left });
    setAmountDrafts((prev) => ({ ...prev, [invoice.id]: String(invoice.amount_paid ?? 0) }));
    setOpenPartialId(invoice.id);
  };

  const handleAmountPaidChange = (invoiceId: string, value: string) => {
    setAmountDrafts((prev) => ({ ...prev, [invoiceId]: value }));
  };

  const savePartialAmount = async (invoice: InvoiceSummary) => {
    const raw = amountDrafts[invoice.id];
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) return;
    await updateInvoicePayment(invoice.id, { payment_status: "partial", amount_paid: amount });
    patchInvoiceLocally(invoice.id, { payment_status: "partial", amount_paid: amount });
    getPaymentsSummary().then(setSummary);
    setOpenPartialId(null);
  };

  const handleCategoryChange = async (invoiceId: string, categoryId: string) => {
    await setInvoiceCategory(invoiceId, categoryId || null);
    refresh();
  };

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{t("payments.title")}</h1>
          <p className="page-subtitle">{t("payments.subtitle")}</p>
        </div>
      </div>

      {summary && (
        <div className="stat-grid">
          <div className="card stat-card">
            <div className="stat-card-icon">
              <IconClipboard width={17} height={17} />
            </div>
            <div className="stat-card-value">{formatMoney(summary.total_outstanding)}</div>
            <div className="stat-card-label">{t("payments.statOutstanding")}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-card-icon stat-card-icon-red">
              <IconAlertTriangle width={17} height={17} />
            </div>
            <div className="stat-card-value">{summary.overdue_count}</div>
            <div className="stat-card-label">
              {t("payments.statOverdue", { amount: formatMoney(summary.overdue_total) })}
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-card-icon stat-card-icon-orange">
              <IconCreditCard width={17} height={17} />
            </div>
            <div className="stat-card-value">{summary.partial_count}</div>
            <div className="stat-card-label">
              {t("payments.statPartial", { amount: formatMoney(summary.partial_total) })}
            </div>
          </div>
        </div>
      )}

      <div className="status-filters">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={filter === f.value ? "filter-active" : ""}
            onClick={() => setFilter(f.value)}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      <div className="card table-card">
        {isLoading ? (
          <p className="loading-state">{t("payments.loading")}</p>
        ) : invoices.length === 0 ? (
          <p className="empty-state">{t(EMPTY_KEYS[filter])}</p>
        ) : (
          <>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("common.colVendor")}</th>
                  <th>{t("common.colInvoiceNumber")}</th>
                  <th>{t("common.colDueDate")}</th>
                  <th>{t("common.colTotal")}</th>
                  <th>{t("invoiceDetail.category")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link to={`/invoices/${invoice.id}`}>{invoice.vendor_name ?? t("common.unknownVendor")}</Link>
                    </td>
                    <td className={invoice.invoice_number ? "" : "cell-muted"}>
                      {invoice.invoice_number ?? "—"}
                    </td>
                    <td className={isOverdue(invoice) ? "cell-overdue" : invoice.due_date ? "" : "cell-muted"}>
                      {invoice.due_date ?? "—"}
                      {isOverdue(invoice) && ` ${t("payments.overdueSuffix")}`}
                    </td>
                    <td className="cell-amount">{formatMoney(invoice.total)}</td>
                    <td>
                      <select
                        className="table-select"
                        value={invoice.category_id ?? ""}
                        onChange={(e) => void handleCategoryChange(invoice.id, e.target.value)}
                      >
                        <option value="">{t("common.uncategorized")}</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {translateCategoryName(category.name, language)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="payment-status-cell">
                        <div className="payment-status-toggle">
                          <button
                            className={invoice.payment_status === "unpaid" ? "payment-status-active-unpaid" : ""}
                            onClick={() => void setPaymentStatus(invoice, "unpaid")}
                          >
                            {t("common.unpaid")}
                          </button>
                          <button
                            className={invoice.payment_status === "partial" ? "payment-status-active-partial" : ""}
                            onClick={(e) => openPartialPopover(invoice, e)}
                          >
                            {t("common.partial")}
                          </button>
                          <button
                            className={invoice.payment_status === "paid" ? "payment-status-active-paid" : ""}
                            onClick={() => void setPaymentStatus(invoice, "paid")}
                          >
                            {t("common.paid")}
                          </button>
                        </div>

                        {invoice.payment_status === "partial" &&
                          openPartialId !== invoice.id &&
                          invoice.total !== null &&
                          Number(invoice.total) > 0 && (
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
                                  style={{
                                    width: `${Math.min((Number(invoice.amount_paid) / Number(invoice.total)) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                        {openPartialId === invoice.id &&
                          popoverPos &&
                          createPortal(
                            <div
                              className="partial-popover"
                              ref={popoverRef}
                              style={{ top: popoverPos.top, left: popoverPos.left }}
                            >
                              <div className="partial-popover-title">{t("payments.partialPopoverTitle")}</div>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                autoFocus
                                className="amount-paid-input"
                                placeholder={t("payments.amountPaidPlaceholder")}
                                value={amountDrafts[invoice.id] ?? ""}
                                onChange={(e) => handleAmountPaidChange(invoice.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void savePartialAmount(invoice);
                                }}
                              />
                              {invoice.total !== null && (
                                <div className="partial-popover-remaining">
                                  {t("payments.remaining", {
                                    amount: formatMoney(
                                      Math.max(invoice.total - (Number(amountDrafts[invoice.id]) || 0), 0)
                                    ),
                                  })}
                                </div>
                              )}
                              <div className="partial-popover-actions">
                                <button className="inline-action" onClick={() => setOpenPartialId(null)}>
                                  {t("common.cancel")}
                                </button>
                                <button
                                  className="save-button merge-button"
                                  onClick={() => void savePartialAmount(invoice)}
                                >
                                  {t("payments.save")}
                                </button>
                              </div>
                            </div>,
                            document.body
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} onPrev={prev} onNext={next} />
          </>
        )}
      </div>
    </div>
  );
}
