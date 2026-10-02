import { IconHelp } from "../components/icons";
import { useLanguage } from "../context/LanguageContext";

export function Help() {
  const { t } = useLanguage();
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{t("help.title")}</h1>
          <p className="page-subtitle">{t("help.subtitle")}</p>
        </div>
      </div>

      <div className="help-grid">
        <div className="card help-card">
          <div className="card-header-icon">
            <span className="icon-badge">
              <IconHelp width={15} height={15} />
            </span>
            <h2>{t("help.howItWorks")}</h2>
          </div>
          <ol className="help-steps">
            <li>{t("help.step1")}</li>
            <li>{t("help.step2")}</li>
            <li>{t("help.step3")}</li>
            <li>{t("help.step4")}</li>
            <li>{t("help.step5")}</li>
          </ol>
          <div className="format-chip-row">
            <span className="format-chip">PDF</span>
            <span className="format-chip">PNG</span>
            <span className="format-chip">JPG</span>
            <span className="format-chip">WEBP</span>
            <span className="format-chip">GIF</span>
          </div>
        </div>

        <div className="card help-card">
          <div className="card-header-icon">
            <span className="icon-badge">
              <IconHelp width={15} height={15} />
            </span>
            <h2>{t("help.faqTitle")}</h2>
          </div>
          <dl>
            <div className="faq-item">
              <dt>{t("help.faq1q")}</dt>
              <dd>{t("help.faq1a")}</dd>
            </div>
            <div className="faq-item">
              <dt>{t("help.faq2q")}</dt>
              <dd>{t("help.faq2a")}</dd>
            </div>
            <div className="faq-item">
              <dt>{t("help.faq3q")}</dt>
              <dd>{t("help.faq3a")}</dd>
            </div>
            <div className="faq-item">
              <dt>{t("help.faq4q")}</dt>
              <dd>{t("help.faq4a")}</dd>
            </div>
            <div className="faq-item">
              <dt>{t("help.faq5q")}</dt>
              <dd>
                {t("help.faq5aPrefix")} <strong>{t("nav.myActivity")}</strong> {t("help.faq5aSuffix")}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
