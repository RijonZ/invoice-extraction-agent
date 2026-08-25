import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listVendors, mergeVendor, renameVendor } from "../api/client";
import { IconBuilding, IconChart, IconTrendUp } from "../components/icons";
import { Pagination } from "../components/Pagination";
import { useLanguage } from "../context/LanguageContext";
import { usePagination } from "../hooks/usePagination";
import type { Vendor } from "../types/admin";

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Vendors() {
  const { t } = useLanguage();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [mergeSourceId, setMergeSourceId] = useState<string>("");
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [mergeError, setMergeError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setIsLoading(true);
    listVendors()
      .then(setVendors)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalSpend = useMemo(() => vendors.reduce((sum, v) => sum + v.total_spend, 0), [vendors]);
  const { pageItems, page, totalPages, next, prev } = usePagination(vendors);

  const startEdit = (vendor: Vendor) => {
    setEditingId(vendor.id);
    setEditName(vendor.name);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await renameVendor(editingId, editName);
    setEditingId(null);
    refresh();
  };

  const handleMerge = async () => {
    setMergeError(null);
    if (!mergeSourceId || !mergeTargetId) {
      setMergeError(t("vendors.mergeErrorBoth"));
      return;
    }
    if (mergeSourceId === mergeTargetId) {
      setMergeError(t("vendors.mergeErrorSame"));
      return;
    }
    try {
      await mergeVendor(mergeSourceId, mergeTargetId);
      setMergeSourceId("");
      setMergeTargetId("");
      refresh();
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{t("vendors.title")}</h1>
          <p className="page-subtitle">{t("vendors.subtitle")}</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-card-icon">
            <IconBuilding width={17} height={17} />
          </div>
          <div className="stat-card-value">{vendors.length}</div>
          <div className="stat-card-label">{t("vendors.statTotal")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-green">
            <IconChart width={17} height={17} />
          </div>
          <div className="stat-card-value">{formatMoney(totalSpend)}</div>
          <div className="stat-card-label">{t("vendors.statSpend")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-amber">
            <IconTrendUp width={17} height={17} />
          </div>
          <div className="stat-card-value">
            {formatMoney(vendors.length ? totalSpend / vendors.length : 0)}
          </div>
          <div className="stat-card-label">{t("vendors.statAvg")}</div>
        </div>
      </div>

      {vendors.length > 1 && (
        <div className="card merge-panel">
          <h2>{t("vendors.mergeTitle")}</h2>
          <div className="merge-controls">
            <select value={mergeSourceId} onChange={(e) => setMergeSourceId(e.target.value)}>
              <option value="">{t("vendors.mergeSourcePlaceholder")}</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <span>{t("vendors.mergeInto")}</span>
            <select value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)}>
              <option value="">{t("vendors.mergeTargetPlaceholder")}</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <button className="save-button merge-button" onClick={handleMerge}>
              {t("vendors.mergeButton")}
            </button>
          </div>
          {mergeError && <p className="error-text">{mergeError}</p>}
        </div>
      )}

      <div className="card table-card">
        {isLoading ? (
          <p className="loading-state">{t("vendors.loading")}</p>
        ) : vendors.length === 0 ? (
          <p className="empty-state">{t("vendors.empty")}</p>
        ) : (
          <>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("common.colVendor")}</th>
                  <th>{t("common.colInvoices")}</th>
                  <th>{t("common.colSpend")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      {editingId === vendor.id ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            autoFocus
                          />
                          <button className="inline-action" onClick={saveEdit}>
                            {t("common.save")}
                          </button>
                          <button className="inline-action" onClick={() => setEditingId(null)}>
                            {t("common.cancel")}
                          </button>
                        </div>
                      ) : (
                        <button className="link-button row-with-avatar" onClick={() => startEdit(vendor)}>
                          <span className="row-avatar">{initials(vendor.name)}</span>
                          {vendor.name}
                        </button>
                      )}
                    </td>
                    <td className="cell-amount">{vendor.invoice_count}</td>
                    <td className="cell-amount">{formatMoney(vendor.total_spend)}</td>
                    <td>
                      <Link to={`/admin/vendors/${vendor.id}`} className="inline-action-link">
                        {t("vendors.viewInvoices")}
                      </Link>
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
