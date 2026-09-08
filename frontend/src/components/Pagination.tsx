import { useLanguage } from "../context/LanguageContext";
import { IconChevronLeft, IconChevronRight } from "./icons";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
  const { t } = useLanguage();
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button className="pagination-button" onClick={onPrev} disabled={page === 1}>
        <IconChevronLeft width={16} height={16} />
        {t("pagination.previous")}
      </button>
      <span className="pagination-status">{t("common.pageOf", { page, totalPages })}</span>
      <button className="pagination-button" onClick={onNext} disabled={page === totalPages}>
        {t("pagination.next")}
        <IconChevronRight width={16} height={16} />
      </button>
    </div>
  );
}
