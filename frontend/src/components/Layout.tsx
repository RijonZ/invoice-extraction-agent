import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import { IconDashboard, IconHelp } from "./icons";

const WORKSPACE_LINKS: Array<{ to: string; labelKey: TranslationKey; icon: typeof IconHelp }> = [
  { to: "/help", labelKey: "nav.help", icon: IconHelp },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Link to="/" className="sidebar-brand-link">
            <span className="app-logo">IE</span>
            <span className="sidebar-brand-name">Invoice Extraction Agent</span>
          </Link>
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
        </nav>
      </aside>

      <div className="app-content">
        <main>{children}</main>
      </div>
    </div>
  );
}
