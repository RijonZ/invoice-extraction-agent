import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { IconLogout, IconUserCircle } from "./icons";

interface UserMenuPanelProps {
  onClose: () => void;
}

export function UserMenuPanel({ onClose }: UserMenuPanelProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  if (!user) return null;

  return (
    <div className="usermenu-panel">
      <div className="usermenu-header">
        <span className="usermenu-name">{user.name}</span>
        <span className="usermenu-email">{user.email}</span>
        <span className="usermenu-role-badge">
          {user.role === "admin" ? t("common.roleAdmin") : t("common.roleUser")}
        </span>
      </div>
      <Link to="/account" className="usermenu-item" onClick={onClose}>
        <IconUserCircle width={16} height={16} />
        {t("userMenu.accountSettings")}
      </Link>
      <button
        type="button"
        className="usermenu-item usermenu-item-danger"
        onClick={() => {
          onClose();
          void logout();
        }}
      >
        <IconLogout width={16} height={16} />
        {t("userMenu.signOut")}
      </button>
    </div>
  );
}
