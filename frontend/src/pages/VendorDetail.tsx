import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getVendor } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { useLanguage } from "../context/LanguageContext";
import type { VendorDetail as VendorDetailRecord } from "../types/admin";

function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [vendor, setVendor] = useState<VendorDetailRecord | null>(null);

  useEffect(() => {
    if (id) getVendor(id).then(setVendor);
  }, [id]);

  if (!vendor) {
    return (
      <div className="page">
        <p className="loading-state">{t("vendorDetail.loading")}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/admin/vendors" className="back-link">
        {t("vendorDetail.back")}
      </Link>

      <div className="detail-header">
        <h1>{vendor.name}</h1>
      </div>
      <p className="detail-meta">
        {vendor.invoice_count} {vendor.invoice_count === 1 ? t("common.invoiceSingular") : t("common.invoicePlural")} ·{" "}
        {formatMoney(vendor.total_spend)} {t("vendorDetail.totalSpendSuffix")}
      </p>

      <div className="card table-card">
        {vendor.invoices.length === 0 ? (
          <p className="empty-state">{t("vendorDetail.empty")}</p>
        ) : (
          <table className="invoice-table">
            <thead>
              <tr>
                <th>{t("common.colInvoiceNumber")}</th>
                <th>{t("common.colDate")}</th>
                <th>{t("common.colTotal")}</th>
                <th>{t("common.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {vendor.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <Link to={`/invoices/${invoice.id}`}>{invoice.invoice_number ?? "—"}</Link>
                  </td>
                  <td className={invoice.invoice_date ? "" : "cell-muted"}>
                    {invoice.invoice_date ?? "—"}
                  </td>
                  <td className="cell-amount">{formatMoney(invoice.total)}</td>
                  <td>
                    <StatusBadge status={invoice.status} />
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
