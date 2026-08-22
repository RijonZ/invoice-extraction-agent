import { useLanguage } from "../context/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import type { InvoiceStatus } from "../types/invoice";

const LABEL_KEYS: Record<InvoiceStatus, TranslationKey> = {
  processing: "common.statusProcessing",
  needs_review: "common.statusNeedsReview",
  approved: "common.statusApproved",
  error: "common.statusError",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { t } = useLanguage();
  return <span className={`status-badge status-${status}`}>{t(LABEL_KEYS[status])}</span>;
}
