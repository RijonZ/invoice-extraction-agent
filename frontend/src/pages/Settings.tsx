import { useEffect, useState } from "react";
import { getAppSettings, updateAppSettings } from "../api/client";
import { IconMegaphone, IconSettings } from "../components/icons";
import { useLanguage } from "../context/LanguageContext";
import { useSettings } from "../context/SettingsContext";

export function Settings() {
  const { refresh: refreshPublicSettings } = useSettings();
  const { t } = useLanguage();

  const [companyName, setCompanyName] = useState("");
  const [extractionModel, setExtractionModel] = useState("");
  const [amountTolerance, setAmountTolerance] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("");
  const [bannerMessage, setBannerMessage] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAppSettings()
      .then((settings) => {
        setCompanyName(settings.company_name);
        setExtractionModel(settings.extraction_model);
        setAmountTolerance(String(settings.amount_tolerance));
        setMaxAttempts(String(settings.max_extraction_attempts));
        setDefaultCurrency(settings.default_currency);
        setBannerMessage(settings.banner_message ?? "");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);
    try {
      const tolerance = Number(amountTolerance);
      const attempts = Number(maxAttempts);
      if (Number.isNaN(tolerance) || tolerance < 0) {
        throw new Error(t("settings.errorTolerance"));
      }
      if (!Number.isInteger(attempts) || attempts < 1 || attempts > 10) {
        throw new Error(t("settings.errorAttempts"));
      }
      await updateAppSettings({
        company_name: companyName,
        extraction_model: extractionModel,
        amount_tolerance: tolerance,
        max_extraction_attempts: attempts,
        default_currency: defaultCurrency,
        banner_message: bannerMessage,
      });
      refreshPublicSettings();
      setMessage(t("settings.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page">
        <p className="loading-state">{t("settings.loading")}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{t("settings.title")}</h1>
          <p className="page-subtitle">{t("settings.subtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="settings-grid">
          <div className="card settings-card">
            <div className="card-header-icon">
              <span className="icon-badge">
                <IconMegaphone width={15} height={15} />
              </span>
              <h2>{t("settings.branding")}</h2>
            </div>
            <label className="field-row-vertical">
              <span className="field-row-label">{t("settings.companyName")}</span>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
              <span className="field-hint">{t("settings.companyNameHint")}</span>
            </label>
            <label className="field-row-vertical">
              <span className="field-row-label">{t("settings.bannerMessage")}</span>
              <input
                value={bannerMessage}
                onChange={(e) => setBannerMessage(e.target.value)}
                placeholder={t("settings.bannerPlaceholder")}
              />
              <span className="field-hint">{t("settings.bannerHint")}</span>
            </label>
          </div>

          <div className="card settings-card">
            <div className="card-header-icon">
              <span className="icon-badge">
                <IconSettings width={15} height={15} />
              </span>
              <h2>{t("settings.extraction")}</h2>
            </div>
            <label className="field-row-vertical">
              <span className="field-row-label">{t("settings.extractionModel")}</span>
              <input
                value={extractionModel}
                onChange={(e) => setExtractionModel(e.target.value)}
                required
              />
            </label>
            <label className="field-row-vertical">
              <span className="field-row-label">{t("settings.maxAttempts")}</span>
              <input
                type="number"
                step="1"
                min="1"
                max="10"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                required
              />
              <span className="field-hint">{t("settings.maxAttemptsHint")}</span>
            </label>
            <label className="field-row-vertical">
              <span className="field-row-label">{t("settings.defaultCurrency")}</span>
              <input
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                required
              />
              <span className="field-hint">{t("settings.defaultCurrencyHint")}</span>
            </label>
            <label className="field-row-vertical">
              <span className="field-row-label">{t("settings.tolerance")}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountTolerance}
                onChange={(e) => setAmountTolerance(e.target.value)}
                required
              />
              <span className="field-hint">{t("settings.toleranceHint")}</span>
            </label>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
        {message && <p className="success-text">{message}</p>}
        <button className="save-button" type="submit" disabled={isSaving} style={{ maxWidth: 240 }}>
          {isSaving ? t("common.saving") : t("settings.saveButton")}
        </button>
      </form>
    </div>
  );
}
