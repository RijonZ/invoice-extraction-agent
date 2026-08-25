import { useCallback, useEffect, useMemo, useState } from "react";
import { listUsers, updateUser } from "../api/client";
import { Pagination } from "../components/Pagination";
import { IconCheckCircle, IconSettings, IconUsers } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { usePagination } from "../hooks/usePagination";
import type { ManagedUser } from "../types/admin";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Users() {
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setIsLoading(true);
    listUsers()
      .then(setUsers)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const adminCount = useMemo(() => users.filter((u) => u.role === "admin").length, [users]);
  const activeCount = useMemo(() => users.filter((u) => u.is_active).length, [users]);
  const { pageItems, page, totalPages, next, prev } = usePagination(users);

  const toggleRole = async (target: ManagedUser) => {
    await updateUser(target.id, { role: target.role === "admin" ? "user" : "admin" });
    refresh();
  };

  const toggleActive = async (target: ManagedUser) => {
    await updateUser(target.id, { is_active: !target.is_active });
    refresh();
  };

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{t("users.title")}</h1>
          <p className="page-subtitle">{t("users.subtitle")}</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-card-icon">
            <IconUsers width={17} height={17} />
          </div>
          <div className="stat-card-value">{users.length}</div>
          <div className="stat-card-label">{t("users.statTotal")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-amber">
            <IconSettings width={17} height={17} />
          </div>
          <div className="stat-card-value">{adminCount}</div>
          <div className="stat-card-label">{t("users.statAdmins")}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-icon stat-card-icon-green">
            <IconCheckCircle width={17} height={17} />
          </div>
          <div className="stat-card-value">{activeCount}</div>
          <div className="stat-card-label">{t("users.statActive")}</div>
        </div>
      </div>

      <div className="card table-card">
        {isLoading ? (
          <p className="loading-state">{t("users.loading")}</p>
        ) : (
          <>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("common.colName")}</th>
                  <th>{t("common.colEmail")}</th>
                  <th>{t("common.colRole")}</th>
                  <th>{t("common.colStatus")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="row-with-avatar">
                        <span className="row-avatar">{initials(u.name)}</span>
                        {u.name}
                      </div>
                    </td>
                    <td className="cell-muted">{u.email}</td>
                    <td>
                      <span className={`status-badge status-${u.role === "admin" ? "approved" : "processing"}`}>
                        {u.role === "admin" ? t("common.roleAdmin") : t("common.roleUser")}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${u.is_active ? "approved" : "error"}`}>
                        {u.is_active ? t("common.active") : t("common.disabled")}
                      </span>
                    </td>
                    <td>
                      {u.id !== currentUser?.id && (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button className="inline-action" onClick={() => toggleRole(u)}>
                            {u.role === "admin" ? t("users.makeUser") : t("users.makeAdmin")}
                          </button>
                          <button className="inline-action" onClick={() => toggleActive(u)}>
                            {u.is_active ? t("users.disable") : t("users.enable")}
                          </button>
                        </div>
                      )}
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
