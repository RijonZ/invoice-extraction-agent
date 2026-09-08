import { useEffect, useMemo, useState } from "react";
import { listMyActivity } from "../api/client";
import { Pagination } from "../components/Pagination";
import { IconHistory, IconTrendUp } from "../components/icons";
import { useLanguage } from "../context/LanguageContext";
import { usePagination } from "../hooks/usePagination";
import type { AuditLogEntry } from "../types/admin";
import { actionBadgeClass, formatAction, formatMetadata } from "../utils/auditLog";

export function MyActivity() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listMyActivity()
      .then(setEntries)
      .finally(() => setIsLoading(false));
  }, []);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return entries.filter((e) => new Date(e.created_at).toDateString() === today).length;
  }, [entries]);

  const { pageItems, page, totalPages, next, prev } = usePagination(entries);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{t("myActivity.title")}</h1>
          <p className="page-subtitle">{t("myActivity.subtitle")}</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-card-icon">
            <IconTrendUp width={17} height={17} />
          </div>
          <div className="stat-card-value">{entries.length}</div>
          <div className="stat-card-label">{t("myActivity.statTotal")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-amber">
            <IconHistory width={17} height={17} />
          </div>
          <div className="stat-card-value">{todayCount}</div>
          <div className="stat-card-label">{t("myActivity.statToday")}</div>
        </div>
      </div>

      <div className="card table-card">
        {isLoading ? (
          <p className="loading-state">{t("myActivity.loading")}</p>
        ) : entries.length === 0 ? (
          <p className="empty-state">{t("myActivity.empty")}</p>
        ) : (
          <>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("common.colWhen")}</th>
                  <th>{t("common.colAction")}</th>
                  <th>{t("common.colDetails")}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((entry) => (
                  <tr key={entry.id}>
                    <td className="cell-muted">{new Date(entry.created_at).toLocaleString()}</td>
                    <td>
                      <span className={actionBadgeClass(entry.action)}>{formatAction(entry.action)}</span>
                    </td>
                    <td className="cell-muted">{formatMetadata(entry.metadata)}</td>
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
