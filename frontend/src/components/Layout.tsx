import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Link, useLocation } from "react-router-dom";
import { listNotifications } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useSettings } from "../context/SettingsContext";
import type { TranslationKey } from "../i18n/translations";
import {
  IconBell,
  IconBuilding,
  IconChart,
  IconClipboard,
  IconCreditCard,
  IconDashboard,
  IconHelp,
  IconHistory,
  IconMegaphone,
  IconMenu,
  IconSettings,
  IconTag,
  IconTrendUp,
  IconUsers,
  IconX,
} from "./icons";
import { NotificationsPanel } from "./NotificationsPanel";
import { UserMenuPanel } from "./UserMenuPanel";

const WORKSPACE_LINKS: Array<{ to: string; labelKey: TranslationKey; icon: typeof IconTrendUp }> = [
  { to: "/stats", labelKey: "nav.myStats", icon: IconTrendUp },
  { to: "/payments", labelKey: "nav.payments", icon: IconCreditCard },
  { to: "/payment-summary", labelKey: "nav.paymentSummary", icon: IconChart },
  { to: "/activity", labelKey: "nav.myActivity", icon: IconHistory },
  { to: "/help", labelKey: "nav.help", icon: IconHelp },
];

const ADMIN_LINKS: Array<{ to: string; labelKey: TranslationKey; icon: typeof IconBuilding }> = [
  { to: "/admin/vendors", labelKey: "nav.vendors", icon: IconBuilding },
  { to: "/admin/analytics", labelKey: "nav.analytics", icon: IconChart },
  { to: "/admin/users", labelKey: "nav.users", icon: IconUsers },
  { to: "/admin/audit-log", labelKey: "nav.auditLog", icon: IconClipboard },
  { to: "/admin/categories", labelKey: "nav.categories", icon: IconTag },
  { to: "/admin/settings", labelKey: "nav.settings", icon: IconSettings },
];

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Layout({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const { companyName, bannerMessage } = useSettings();
  const { language, toggleLanguage, t } = useLanguage();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  useEffect(() => {
    if (!user) return;
    listNotifications()
      .then((notifications) => setUnreadCount(notifications.filter((n) => !n.is_read).length))
      .catch(() => {});
  }, [user, location.pathname]);

  useEffect(() => {
    setNotifOpen(false);
    setUserMenuOpen(false);
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!notifOpen && !userMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen, userMenuOpen]);

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <aside className={sidebarOpen ? "sidebar sidebar-open" : "sidebar"}>
        <div className="sidebar-brand">
          <Link to="/" className="sidebar-brand-link">
            <span className="app-logo">IE</span>
            <span className="sidebar-brand-name">{companyName}</span>
          </Link>
          <button
            type="button"
            className="sidebar-close"
            aria-label={t("nav.closeMenuAria")}
            onClick={() => setSidebarOpen(false)}
          >
            <IconX width={18} height={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className={isActive("/") && location.pathname === "/" ? "nav-link nav-link-active" : "nav-link"}>
            <IconDashboard />
            {t("nav.invoices")}
          </Link>

          {WORKSPACE_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={isActive(link.to) ? "nav-link nav-link-active" : "nav-link"}
            >
              <link.icon />
              {t(link.labelKey)}
            </Link>
          ))}

          {user?.role === "admin" && (
            <>
              <div className="sidebar-section-label">{t("nav.adminSectionLabel")}</div>
              {ADMIN_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={isActive(link.to) ? "nav-link nav-link-active" : "nav-link"}
                >
                  <link.icon />
                  {t(link.labelKey)}
                </Link>
              ))}
            </>
          )}
        </nav>
      </aside>

      <div className="app-content">
        {user && (
          <div className="topbar">
            <button
              type="button"
              className="menu-toggle"
              aria-label={t("nav.openMenuAria")}
              onClick={() => setSidebarOpen(true)}
            >
              <IconMenu width={20} height={20} />
            </button>

            <button
              type="button"
              className="lang-toggle"
              aria-label={t("nav.languageToggleAria")}
              onClick={toggleLanguage}
            >
              {language === "en" ? "EN" : "SQ"}
            </button>

            <div className="notifications-anchor" ref={notifRef}>
              <button
                type="button"
                className={notifOpen ? "bell-button bell-button-active" : "bell-button"}
                aria-label={t("nav.notificationsAria")}
                onClick={() => setNotifOpen((open) => !open)}
              >
                <IconBell width={18} height={18} />
                {unreadCount > 0 && (
                  <span className="bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                )}
              </button>
              {notifOpen && (
                <NotificationsPanel
                  onUnreadCountChange={setUnreadCount}
                  onNavigate={() => setNotifOpen(false)}
                />
              )}
            </div>

            <div className="usermenu-anchor" ref={userMenuRef}>
              <button
                type="button"
                className="usermenu-button"
                aria-label={t("nav.accountMenuAria")}
                onClick={() => setUserMenuOpen((open) => !open)}
              >
                {user ? initials(user.name) : ""}
              </button>
              {userMenuOpen && <UserMenuPanel onClose={() => setUserMenuOpen(false)} />}
            </div>
          </div>
        )}
        {bannerMessage && (
          <div className="app-banner">
            <IconMegaphone />
            <span>{bannerMessage}</span>
          </div>
        )}
        <main>{children}</main>
      </div>
    </div>
  );
}
