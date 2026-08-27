import { useState } from "react";
import { changePassword } from "../api/client";
import { IconLock, IconUserCircle } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export function AccountSettings() {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState(user?.name ?? "");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  if (!user) return null;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    setIsSavingProfile(true);
    try {
      await updateProfile(name);
      setProfileMessage(t("account.saved"));
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordError(t("account.passwordMismatch"));
      return;
    }
    setIsSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage(t("account.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{t("account.title")}</h1>
          <p className="page-subtitle">{t("account.subtitle")}</p>
        </div>
      </div>

      <div className="settings-grid">
        <form className="card settings-card" onSubmit={handleProfileSubmit}>
          <div className="card-header-icon">
            <span className="icon-badge">
              <IconUserCircle width={15} height={15} />
            </span>
            <h2>{t("account.profile")}</h2>
          </div>
          <label className="field-row-vertical">
            <span className="field-row-label">{t("account.email")}</span>
            <input value={user.email} disabled />
          </label>
          <label className="field-row-vertical">
            <span className="field-row-label">{t("account.name")}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          {profileError && <p className="error-text">{profileError}</p>}
          {profileMessage && <p className="success-text">{profileMessage}</p>}
          <button className="save-button" type="submit" disabled={isSavingProfile}>
            {isSavingProfile ? t("common.saving") : t("account.saveProfile")}
          </button>
        </form>

        <form className="card settings-card" onSubmit={handlePasswordSubmit}>
          <div className="card-header-icon">
            <span className="icon-badge">
              <IconLock width={15} height={15} />
            </span>
            <h2>{t("account.changePassword")}</h2>
          </div>
          <label className="field-row-vertical">
            <span className="field-row-label">{t("account.currentPassword")}</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label className="field-row-vertical">
            <span className="field-row-label">{t("account.newPassword")}</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label className="field-row-vertical">
            <span className="field-row-label">{t("account.confirmPassword")}</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          {passwordError && <p className="error-text">{passwordError}</p>}
          {passwordMessage && <p className="success-text">{passwordMessage}</p>}
          <button className="save-button" type="submit" disabled={isSavingPassword}>
            {isSavingPassword ? t("common.saving") : t("account.changePassword")}
          </button>
        </form>
      </div>
    </div>
  );
}
