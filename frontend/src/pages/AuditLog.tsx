import { useEffect, useMemo, useState } from "react";
import { listAuditLog } from "../api/client";
import { Pagination } from "../components/Pagination";
import { IconClipboard, IconHistory } from "../components/icons";
import { useLanguage } from "../context/LanguageContext";
import { usePagination } from "../hooks/usePagination";
import type { AuditLogEntry } from "../types/admin";
import { actionBadgeClass, formatAction, formatMetadata } from "../utils/auditLog";

export function AuditLog() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listAuditLog()
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
          <h1>{t("auditLog.title")}</h1>
          <p className="page-subtitle">{t("auditLog.subtitle")}</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-card-icon">
            <IconClipboard width={17} height={17} />
          </div>
          <div className="stat-card-value">{entries.length}</div>
          <div className="stat-card-label">{t("auditLog.statRecent")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-amber">
            <IconHistory width={17} height={17} />
          </div>
          <div className="stat-card-value">{todayCount}</div>
          <div className="stat-card-label">{t("auditLog.statToday")}</div>
        </div>
      </div>

      <div className="card table-card">
        {isLoading ? (
          <p className="loading-state">{t("auditLog.loading")}</p>
        ) : entries.length === 0 ? (
          <p className="empty-state">{t("auditLog.empty")}</p>
        ) : (
          <>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("common.colWhen")}</th>
                  <th>{t("common.colWho")}</th>
                  <th>{t("common.colAction")}</th>
                  <th>{t("common.colDetails")}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((entry) => (
                  <tr key={entry.id}>
                    <td className="cell-muted">{new Date(entry.created_at).toLocaleString()}</td>
                    <td>{entry.user_name ?? t("common.system")}</td>
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
