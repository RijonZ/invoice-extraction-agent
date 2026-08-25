import { useLanguage } from "../../context/LanguageContext";

interface BarRankingProps {
  data: Array<{ label: string; value: number }>;
  valueFormatter?: (value: number) => string;
}

// Single-measure ranking bars: one series, so one fixed hue and no legend —
// the card title already names what's plotted.
export function BarRanking({ data, valueFormatter = String }: BarRankingProps) {
  const { t } = useLanguage();
  if (data.length === 0) {
    return <p className="empty-state">{t("common.noData")}</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bar-ranking">
      {data.map((d) => (
        <div className="bar-ranking-row" key={d.label}>
          <span className="bar-ranking-label" title={d.label}>
            {d.label}
          </span>
          <div className="bar-ranking-track">
            <div
              className="bar-ranking-fill"
              style={{ width: `${Math.max((d.value / max) * 100, 3)}%` }}
              title={`${d.label}: ${valueFormatter(d.value)}`}
            />
          </div>
          <span className="bar-ranking-value">{valueFormatter(d.value)}</span>
        </div>
      ))}
    </div>
  );
}
