import { useState } from "react";
import { Navigate } from "react-router-dom";
import { IconChart } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useSettings } from "../context/SettingsContext";

export function Login() {
  const { user, isLoading, login, register } = useAuth();
  const { companyName } = useSettings();
  const { t } = useLanguage();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-logo-lg">
            <IconChart width={24} height={24} />
          </div>
          <h1>{companyName}</h1>
          <p>{t("login.tagline")}</p>
        </div>
      </div>

      <div className="auth-form-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h1 className="auth-title">{mode === "login" ? t("login.signIn") : t("login.createAccount")}</h1>
          <p className="page-subtitle" style={{ marginBottom: "1.5rem" }}>
            {mode === "login" ? t("login.welcomeBack") : t("login.setupAccount")}
          </p>

          {mode === "register" && (
            <label className="field-row-vertical">
              <span className="field-row-label">{t("login.name")}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
          )}
          <label className="field-row-vertical">
            <span className="field-row-label">{t("login.email")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field-row-vertical">
            <span className="field-row-label">{t("login.password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button className="save-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("common.pleaseWait") : mode === "login" ? t("login.signIn") : t("login.createAccountBtn")}
          </button>

          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
          >
            {mode === "login" ? t("login.needAccount") : t("login.haveAccount")}
          </button>
        </form>
      </div>
    </div>
  );
}
