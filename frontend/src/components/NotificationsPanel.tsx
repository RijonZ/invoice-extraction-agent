import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/client";
import { useLanguage } from "../context/LanguageContext";
import type { Notification } from "../types/invoice";
import { IconAlertTriangle, IconBell, IconCheckCircle, IconX } from "./icons";

function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface NotificationsPanelProps {
  onUnreadCountChange: (count: number) => void;
  onNavigate: () => void;
}

export function NotificationsPanel({ onUnreadCountChange, onNavigate }: NotificationsPanelProps) {
  const { t } = useLanguage();

  function invoiceLabel(n: Notification): string {
    const vendor = n.vendor_name ?? t("common.unknownVendor");
    return n.invoice_number ? `${vendor} · ${n.invoice_number}` : vendor;
  }

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listNotifications()
      .then((data) => {
        setNotifications(data);
        onUnreadCountChange(data.filter((n) => !n.is_read).length);
      })
      .finally(() => setIsLoading(false));
    // Only fetch once, on open — onUnreadCountChange is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (next: Notification[]) => {
    setNotifications(next);
    onUnreadCountChange(next.filter((n) => !n.is_read).length);
  };

  const handleOpen = (invoiceId: string) => {
    update(notifications.map((n) => (n.invoice_id === invoiceId ? { ...n, is_read: true } : n)));
    void markNotificationRead(invoiceId);
    onNavigate();
    navigate(`/invoices/${invoiceId}`);
  };

  const handleDelete = (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation();
    update(notifications.filter((n) => n.invoice_id !== invoiceId));
    void deleteNotification(invoiceId);
  };

  const handleMarkAllRead = async () => {
    update(notifications.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsRead();
  };

  const errors = notifications.filter((n) => n.status === "error");
  const needsReview = notifications.filter((n) => n.status === "needs_review");
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function renderSection(title: string, items: Notification[], tone: "red" | "orange", Icon: typeof IconBell) {
    if (items.length === 0) return null;
    const soft = tone === "red" ? "var(--color-red-soft)" : "var(--color-orange-soft)";
    const text = tone === "red" ? "var(--color-red-text)" : "var(--color-orange-text)";

    return (
      <div>
        <div className="notif-panel-section-label">{title}</div>
        {items.map((n) => (
          <div
            key={n.invoice_id}
            className={n.is_read ? "notification-item" : "notification-item notification-item-unread"}
            role="button"
            tabIndex={0}
            onClick={() => handleOpen(n.invoice_id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleOpen(n.invoice_id);
            }}
          >
            <span className="notification-icon" style={{ background: soft, color: text }}>
              <Icon width={16} height={16} />
            </span>
            <span className="notification-body">
              <span className="notification-title">
                {!n.is_read && <span className="notification-dot" />}
                {invoiceLabel(n)}
              </span>
              <span className="notification-meta">
                {tone === "red"
                  ? t("notifications.extractionFailed")
                  : `${n.invoice_date ? `${t("notifications.dated", { date: n.invoice_date })} ` : ""}${formatMoney(n.total)}`}
              </span>
            </span>
            <button
              className="notification-dismiss"
              onClick={(e) => handleDelete(e, n.invoice_id)}
              aria-label={t("notifications.deleteAria")}
            >
              <IconX width={14} height={14} />
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="notif-panel">
      <div className="notif-panel-header">
        <span>{t("notifications.title")}</span>
        {unreadCount > 0 && (
          <button className="notif-panel-mark-all" onClick={handleMarkAllRead}>
            <IconCheckCircle width={13} height={13} />
            {t("notifications.markAllRead")}
          </button>
        )}
      </div>
      <div className="notif-panel-body">
        {isLoading ? (
          <p className="empty-state" style={{ padding: "1.75rem 1.25rem" }}>
            {t("notifications.loading")}
          </p>
        ) : notifications.length === 0 ? (
          <p className="empty-state" style={{ padding: "1.75rem 1.25rem" }}>
            {t("notifications.empty")}
          </p>
        ) : (
          <>
            {renderSection(t("notifications.extractionErrors"), errors, "red", IconAlertTriangle)}
            {renderSection(t("notifications.needsReview"), needsReview, "orange", IconBell)}
          </>
        )}
      </div>
    </div>
  );
}
