"use client";

import { type CSSProperties, type PointerEvent, useState } from "react";

import { useMeasure } from "@/shared/hooks/useMeasure";
import { useI18n } from "@/shared/i18n/useI18n";
import { axisFormatter, niceTicks } from "@/shared/lib/chart";
import { type Currency, formatMoney } from "@/shared/lib/money";

import ChartLegend from "../ChartLegend/ChartLegend";
import ChartTable from "../ChartTable/ChartTable";
import ChartTooltip from "../ChartTooltip/ChartTooltip";
import ChartTooltipRow from "../ChartTooltipRow/ChartTooltipRow";

import styles from "./StackedArea.module.scss";

export interface AreaPoint {
  label: string;
  a: number;
  b: number;
  low?: number;
  high?: number;
}

interface StackedAreaProps {
  points: AreaPoint[];
  currency: Currency;
  seriesA?: string;
  seriesB?: string;
  rangeLabel?: string;
  height?: number;
  xTickEvery?: number;
  xTickFormat?: (label: string) => string;
}

// Room around the plot for the axis labels
const PAD = { top: 10, right: 12, bottom: 22, left: 52 };

// The year of a YYYY-MM label
const yearOf = (label: string) => label.slice(0, 4);

// Two series stacked as bands, savings under investments, the total lined
const StackedArea = ({
  points,
  currency,
  seriesA,
  seriesB,
  rangeLabel,
  height = 260,
  xTickEvery = 12,
  xTickFormat = yearOf,
}: StackedAreaProps) => {
  const { t } = useI18n();
  const labelA = seriesA ?? t("forecast.savings");
  const labelB = seriesB ?? t("balance.investments");
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const count = points.length;
  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = height - PAD.top - PAD.bottom;
  const ranged = Boolean(rangeLabel) && points.some((point) => point.low !== point.high);
  const ticks = niceTicks(Math.max(1, ...points.map((point) => Math.max(point.a + point.b, point.high ?? 0))));
  const top = ticks.at(-1) ?? 1;
  const tickLabel = axisFormatter(top);
  // The horizontal position of a point
  const x = (index: number) => PAD.left + (count > 1 ? (index / (count - 1)) * plotWidth : 0);
  // The vertical position of an amount
  const y = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight;
  // A short amount for the table and the tooltip
  const money = (value: number) => formatMoney(value, currency, { compact: true });

  const lineA = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.a).toFixed(1)}`)
    .join("");
  const lineTotal = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.a + point.b).toFixed(1)}`)
    .join("");
  const areaA = `${lineA} L${x(count - 1).toFixed(1)},${String(y(0))} L${x(0).toFixed(1)},${String(y(0))} Z`;
  const range = ranged
    ? `${points
        .map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.high ?? 0).toFixed(1)}`)
        .join("")}${points
        .toReversed()
        .map((point, index) => `L${x(count - 1 - index).toFixed(1)},${y(point.low ?? 0).toFixed(1)}`)
        .join("")} Z`
    : null;
  const areaB = `${lineTotal}${points
    .toReversed()
    .map((point, index) => `L${x(count - 1 - index).toFixed(1)},${y(point.a).toFixed(1)}`)
    .join("")} Z`;

  // Picks the point nearest to the pointer
  const onMove = (event: PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.round(((event.clientX - rect.left) / Math.max(1, rect.width)) * (count - 1));
    setHover(Math.min(count - 1, Math.max(0, index)));
  };

  if (count < 2) return null;

  const perLabel = plotWidth / Math.max(1, (count - 1) / xTickEvery);
  const labelEvery = xTickEvery * Math.max(1, Math.ceil(38 / Math.max(1, perLabel)));
  const hovered = hover === null ? undefined : points[hover];
  const lineLength: CSSProperties = { "--len": plotWidth * 2.2 };

  return (
    <div>
      <ChartLegend
        items={[
          { label: labelA, color: "var(--series-1)" },
          { label: labelB, color: "var(--series-2)" },
          ...(ranged && rangeLabel ? [{ label: rangeLabel, color: "var(--color-text-tertiary)" }] : []),
        ]}
      />
      <ChartTable
        caption={t("chart.area.caption", { a: labelA, b: labelB })}
        columns={[t("chart.point"), labelA, labelB, t("forecast.col.total"), ...(ranged ? [rangeLabel ?? ""] : [])]}
        rows={points.map((point) => ({
          key: point.label,
          cells: [
            xTickFormat(point.label),
            money(point.a),
            money(point.b),
            money(point.a + point.b),
            ...(ranged ? [`${money(point.low ?? 0)} · ${money(point.high ?? 0)}`] : []),
          ],
        }))}
      />
      <div ref={ref} className={styles.plot} style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} aria-hidden>
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke="var(--color-chart-grid)"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 6}
                  y={y(tick) + 3.5}
                  textAnchor="end"
                  fontSize={11}
                  className={styles.figure}
                  fill="var(--color-text-tertiary)"
                >
                  {tickLabel(tick)}
                </text>
              </g>
            ))}
            {points.map((point, index) =>
              index % labelEvery === 0 ? (
                <text
                  key={point.label}
                  x={x(index)}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--color-text-tertiary)"
                >
                  {xTickFormat(point.label)}
                </text>
              ) : null,
            )}
            {range && <path d={range} fill="var(--color-text)" fillOpacity={0.07} className={styles.area} />}
            <path d={areaA} fill="var(--series-1)" fillOpacity={0.2} className={styles.area} />
            <path d={areaB} fill="var(--series-2)" fillOpacity={0.55} className={styles.area} />
            <path
              d={lineTotal}
              fill="none"
              stroke="var(--series-2)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={styles.line}
              style={lineLength}
            />
            {hovered && hover !== null && (
              <g>
                <line
                  x1={x(hover)}
                  x2={x(hover)}
                  y1={PAD.top}
                  y2={PAD.top + plotHeight}
                  stroke="var(--color-text-tertiary)"
                  strokeWidth={1}
                  opacity={0.5}
                />
                <circle
                  cx={x(hover)}
                  cy={y(hovered.a)}
                  r={4}
                  fill="var(--series-1)"
                  stroke="var(--glass-tint-strong)"
                  strokeWidth={2}
                />
                <circle
                  cx={x(hover)}
                  cy={y(hovered.a + hovered.b)}
                  r={4}
                  fill="var(--series-2)"
                  stroke="var(--glass-tint-strong)"
                  strokeWidth={2}
                />
              </g>
            )}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={plotWidth}
              height={plotHeight}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}
        {hovered && hover !== null && (
          <ChartTooltip x={x(hover)} y={PAD.top} containerWidth={width}>
            <p className={styles.tooltipTitle}>{hovered.label}</p>
            <ChartTooltipRow color="var(--series-2)" label={labelB} value={money(hovered.b)} />
            <ChartTooltipRow color="var(--series-1)" label={labelA} value={money(hovered.a)} />
            <ChartTooltipRow label={t("forecast.col.total")} value={money(hovered.a + hovered.b)} />
            {ranged && hovered.low !== undefined && hovered.high !== undefined && (
              <ChartTooltipRow label={rangeLabel ?? ""} value={`${money(hovered.low)} · ${money(hovered.high)}`} />
            )}
          </ChartTooltip>
        )}
      </div>
    </div>
  );
};

export default StackedArea;
