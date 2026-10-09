import { useId } from "react";
import { useLanguage } from "../../context/LanguageContext";

interface ColumnChartProps {
  data: Array<{ label: string; value: number; meta?: string }>;
  valueFormatter?: (value: number) => string;
}

const WIDTH = 640;
const HEIGHT = 240;
const PADDING = { top: 32, right: 16, bottom: 28, left: 16 };
const BAR_GAP = 16;
const MAX_BAR_WIDTH = 44;
const ZERO_BAR_HEIGHT = 3;
const TOP_RADIUS = 6;

function monthLabel(yyyyMm: string, locale: string): string {
  const [year, month] = yyyyMm.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(locale, { month: "short" });
}

// A rect with rounded top corners only, flush square at the bottom so it
// sits cleanly on the baseline instead of leaving a gap at the corners.
function roundedTopBarPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(TOP_RADIUS, width / 2, height);
  if (r <= 0) {
    return `M${x},${y + height} L${x},${y} L${x + width},${y} L${x + width},${y + height} Z`;
  }
  return `M${x},${y + height}
    L${x},${y + r}
    Q${x},${y} ${x + r},${y}
    L${x + width - r},${y}
    Q${x + width},${y} ${x + width},${y + r}
    L${x + width},${y + height} Z`;
}

// Discrete monthly totals read better as columns than as a line — a line
// implies continuous motion between points, which is misleading when most
// months are legitimately zero. One hue with a soft gradient, rounded
// tops, a dashed average line for context, and a label only on the peak
// month so the chart doesn't turn into a wall of numbers.
export function ColumnChart({ data, valueFormatter = String }: ColumnChartProps) {
  const { t, language } = useLanguage();
  const gradientId = useId();
  const locale = language === "sq" ? "sq-AL" : "en-US";
  if (data.length === 0) {
    return <p className="empty-state">{t("common.noData")}</p>;
  }

  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const average = data.reduce((sum, d) => sum + d.value, 0) / data.length;
  const peakValue = Math.max(...data.map((d) => d.value));

  const barWidth = Math.min((innerWidth - BAR_GAP * (data.length - 1)) / data.length, MAX_BAR_WIDTH);
  const rowWidth = barWidth * data.length + BAR_GAP * (data.length - 1);
  const startX = PADDING.left + (innerWidth - rowWidth) / 2;
  const baselineY = PADDING.top + innerHeight;
  const averageY = baselineY - (average / max) * innerHeight;

  const bars = data.map((d, i) => {
    const x = startX + i * (barWidth + BAR_GAP);
    const barHeight = d.value === 0 ? ZERO_BAR_HEIGHT : Math.max((d.value / max) * innerHeight, 6);
    return { ...d, x, y: baselineY - barHeight, barHeight, isPeak: d.value > 0 && d.value === peakValue };
  });

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="column-chart-svg" role="img" aria-label={t("common.monthlyUploadsAria")}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="column-bar-gradient-start" />
          <stop offset="100%" className="column-bar-gradient-end" />
        </linearGradient>
      </defs>

      {average > 0 && (
        <>
          <line
            x1={PADDING.left}
            y1={averageY}
            x2={WIDTH - PADDING.right}
            y2={averageY}
            className="column-avg-line"
          />
          <text x={WIDTH - PADDING.right} y={averageY - 5} textAnchor="end" className="column-avg-label">
            {t("common.average")} · {valueFormatter(average)}
          </text>
        </>
      )}

      <line x1={PADDING.left} y1={baselineY} x2={WIDTH - PADDING.right} y2={baselineY} className="trend-axis" />

      {bars.map((b) => (
        <g key={b.label} className="column-bar-group">
          <path
            d={roundedTopBarPath(b.x, b.y, barWidth, b.barHeight)}
            fill={b.value === 0 ? undefined : `url(#${gradientId})`}
            className={b.value === 0 ? "column-bar column-bar-zero" : "column-bar"}
          >
            <title>{`${monthLabel(b.label, locale)}: ${valueFormatter(b.value)}${b.meta ? ` · ${b.meta}` : ""}`}</title>
          </path>
          {b.isPeak && (
            <text x={b.x + barWidth / 2} y={b.y - 8} textAnchor="middle" className="column-bar-label">
              {valueFormatter(b.value)}
            </text>
          )}
          <text x={b.x + barWidth / 2} y={HEIGHT - 8} textAnchor="middle" className="trend-tick">
            {monthLabel(b.label, locale)}
          </text>
        </g>
      ))}
    </svg>
  );
}
