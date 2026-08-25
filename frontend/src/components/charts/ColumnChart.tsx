import { useLanguage } from "../../context/LanguageContext";

interface ColumnChartProps {
  data: Array<{ label: string; value: number; meta?: string }>;
  valueFormatter?: (value: number) => string;
}

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 30, right: 16, bottom: 28, left: 16 };
const BAR_GAP = 18;
const MAX_BAR_WIDTH = 48;
const ZERO_BAR_HEIGHT = 3;

function monthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

// Discrete monthly counts read better as columns than as a line — a line
// implies continuous motion between points, which is misleading when most
// months are legitimately zero. One hue, rounded tops, direct value labels
// only where non-zero.
export function ColumnChart({ data, valueFormatter = String }: ColumnChartProps) {
  const { t } = useLanguage();
  if (data.length === 0) {
    return <p className="empty-state">{t("common.noData")}</p>;
  }

  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);

  const barWidth = Math.min((innerWidth - BAR_GAP * (data.length - 1)) / data.length, MAX_BAR_WIDTH);
  const rowWidth = barWidth * data.length + BAR_GAP * (data.length - 1);
  const startX = PADDING.left + (innerWidth - rowWidth) / 2;
  const baselineY = PADDING.top + innerHeight;

  const bars = data.map((d, i) => {
    const x = startX + i * (barWidth + BAR_GAP);
    const barHeight = d.value === 0 ? ZERO_BAR_HEIGHT : Math.max((d.value / max) * innerHeight, 6);
    return { ...d, x, y: baselineY - barHeight, barHeight };
  });

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="column-chart-svg" role="img" aria-label={t("common.monthlyUploadsAria")}>
      <line x1={PADDING.left} y1={baselineY} x2={WIDTH - PADDING.right} y2={baselineY} className="trend-axis" />
      {bars.map((b) => (
        <g key={b.label}>
          <rect
            x={b.x}
            y={b.y}
            width={barWidth}
            height={b.barHeight}
            rx={4}
            className={b.value === 0 ? "column-bar column-bar-zero" : "column-bar"}
          >
            <title>{`${monthLabel(b.label)}: ${valueFormatter(b.value)}${b.meta ? ` · ${b.meta}` : ""}`}</title>
          </rect>
          {b.value > 0 && (
            <text x={b.x + barWidth / 2} y={b.y - 8} textAnchor="middle" className="column-bar-label">
              {valueFormatter(b.value)}
            </text>
          )}
          <text x={b.x + barWidth / 2} y={HEIGHT - 8} textAnchor="middle" className="trend-tick">
            {monthLabel(b.label)}
          </text>
        </g>
      ))}
    </svg>
  );
}
