import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  correctInvoice,
  getInvoice,
  listCategories,
  reprocessInvoice,
  setInvoiceCategory,
  updateInvoicePayment,
} from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { IconAlertTriangle } from "../components/icons";
import { useLanguage } from "../context/LanguageContext";
import { translateCategoryName } from "../i18n/categoryNames";
import type { TranslationKey } from "../i18n/translations";
import type { Category } from "../types/admin";
import type { InvoiceDetailRecord } from "../types/invoice";

const SAVE_REDIRECT_DELAY_MS = 900;

function formatQuantity(value: number | null): string {
  if (value === null) return "—";
  return Number(value).toString();
}

const EDITABLE_FIELDS: Array<{ key: keyof InvoiceDetailRecord; labelKey: TranslationKey }> = [
  { key: "client_name", labelKey: "invoiceDetail.fieldClient" },
  { key: "invoice_number", labelKey: "invoiceDetail.fieldInvoiceNumber" },
  { key: "invoice_date", labelKey: "invoiceDetail.fieldDate" },
  { key: "currency", labelKey: "invoiceDetail.fieldCurrency" },
  { key: "subtotal", labelKey: "invoiceDetail.fieldSubtotal" },
  { key: "tax", labelKey: "invoiceDetail.fieldTax" },
  { key: "total", labelKey: "invoiceDetail.fieldTotal" },
];

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [invoice, setInvoice] = useState<InvoiceDetailRecord | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isReprocessing, setIsReprocessing] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    getInvoice(id).then((data) => {
      setInvoice(data);
      setDueDate(data.due_date ?? "");
      setFormValues(
        Object.fromEntries(
          EDITABLE_FIELDS.map((field) => [field.key, String(data[field.key] ?? "")])
        )
      );
    });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listCategories().then(setCategories);
  }, []);

  const handleCategoryChange = async (categoryId: string) => {
    if (!id) return;
    await setInvoiceCategory(id, categoryId || null);
    load();
  };

  const handleDueDateBlur = async () => {
    if (!id || !invoice) return;
    if (dueDate === (invoice.due_date ?? "")) return;
    await updateInvoicePayment(id, { due_date: dueDate || null });
    load();
  };

  const togglePayment = async () => {
    if (!id || !invoice) return;
    await updateInvoicePayment(id, { payment_status: invoice.payment_status === "paid" ? "unpaid" : "paid" });
    load();
  };

  const handleReprocess = async () => {
    if (!id) return;
    setIsReprocessing(true);
    try {
      await reprocessInvoice(id);
      load();
    } finally {
      setIsReprocessing(false);
    }
  };

  if (!invoice) {
    return (
      <div className="page">
        <p className="loading-state">{t("invoiceDetail.loading")}</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const corrections = Object.fromEntries(
        EDITABLE_FIELDS.map((field) => [field.key, formValues[field.key] || null])
      );
      // The correct endpoint returns a bare invoices row (no vendor_name,
      // category_name, line_items, or file_url) — feeding that straight into
      // `invoice` would crash the next render, since this page reads those
      // fields unconditionally. Navigating away instead of re-rendering here
      // sidesteps that entirely.
      await correctInvoice(id, corrections);
      setSaveMessage(t("invoiceDetail.saveSuccess"));
      setTimeout(() => navigate("/"), SAVE_REDIRECT_DELAY_MS);
      // Safety net for any redirect path I haven't anticipated — re-enable
      // the button rather than leaving it stuck on "Saving…" indefinitely.
      setTimeout(() => setIsSaving(false), SAVE_REDIRECT_DELAY_MS + 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      setIsSaving(false);
    }
  };

  return (
    <div className="page">
      <Link to="/" className="back-link">
        &larr; {t("invoiceDetail.back")}
      </Link>

      <div className="detail-header">
        <h1>{invoice.vendor_name ?? t("common.unknownVendor")}</h1>
        <StatusBadge status={invoice.status} />
      </div>
      <p className="detail-meta">
        {invoice.invoice_number
          ? t("invoiceDetail.invoiceNumber", { number: invoice.invoice_number })
          : t("invoiceDetail.noInvoiceNumber")}
        {invoice.invoice_date ? ` · ${invoice.invoice_date}` : ""}
      </p>

      {invoice.validation_errors.length > 0 && (
        <div className="validation-errors">
          <strong>
            <IconAlertTriangle width={15} height={15} />
            {t("invoiceDetail.validationIssues")}
          </strong>
          <ul>
            {invoice.validation_errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="detail-layout">
        <div className="card detail-preview">
          {invoice.mime_type === "application/pdf" ? (
            <iframe title="invoice document" src={invoice.file_url} className="pdf-frame" />
          ) : (
            <img src={invoice.file_url} alt="invoice document" className="invoice-image" />
          )}
        </div>

        <div className="card detail-fields">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2>{t("invoiceDetail.extractedFields")}</h2>
            <button className="inline-action" onClick={() => void handleReprocess()} disabled={isReprocessing}>
              {isReprocessing ? t("invoiceDetail.reprocessing") : t("invoiceDetail.reprocess")}
            </button>
          </div>
          {EDITABLE_FIELDS.map((field) => (
            <label key={field.key} className="field-row">
              <span className="field-row-label">{t(field.labelKey)}</span>
              <input
                value={formValues[field.key] ?? ""}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
              />
            </label>
          ))}
          {saveError && <p className="error-text">{saveError}</p>}
          {saveMessage && <p className="success-text">{saveMessage}</p>}
          <button className="save-button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("common.saving") : t("invoiceDetail.saveApprove")}
          </button>

          <h2>{t("invoiceDetail.lineItems")}</h2>
          {invoice.line_items.length === 0 ? (
            <p className="empty-state" style={{ padding: "1.5rem 0" }}>
              {t("invoiceDetail.noLineItems")}
            </p>
          ) : (
            <div className="table-scroll">
              <table className="line-items-table">
                <thead>
                  <tr>
                    <th>{t("common.colDescription")}</th>
                    <th>{t("common.colQty")}</th>
                    <th>{t("common.colUnitPrice")}</th>
                    <th>{t("common.colAmount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>{formatQuantity(item.quantity)}</td>
                      <td>{formatQuantity(item.unit_price)}</td>
                      <td>{item.amount ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2>{t("invoiceDetail.categoryAndPayment")}</h2>
          <label className="field-row">
            <span className="field-row-label">{t("invoiceDetail.category")}</span>
            <select value={invoice.category_id ?? ""} onChange={(e) => void handleCategoryChange(e.target.value)}>
              <option value="">{t("common.uncategorized")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {translateCategoryName(category.name, language)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-row">
            <span className="field-row-label">{t("invoiceDetail.dueDate")}</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              onBlur={handleDueDateBlur}
            />
          </label>
          <div className="field-row">
            <span className="field-row-label">{t("invoiceDetail.payment")}</span>
            <div className="payment-row-control">
              <span className={`status-badge status-${invoice.payment_status === "paid" ? "approved" : "needs_review"}`}>
                {invoice.payment_status === "paid"
                  ? t("common.paid")
                  : invoice.payment_status === "partial"
                    ? t("common.partial")
                    : t("common.unpaid")}
              </span>
              <button className="inline-action" onClick={togglePayment}>
                {invoice.payment_status === "paid" ? t("common.markUnpaid") : t("common.markPaid")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
