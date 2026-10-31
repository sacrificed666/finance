"use client";

import { useId, useState } from "react";

import { useMeasure } from "@/shared/hooks/useMeasure";
import { axisFormatter, niceRange, niceTicks } from "@/shared/lib/chart";
import { formatDateShort, formatWeekday } from "@/shared/lib/date";
import { type Currency, formatMoney } from "@/shared/lib/money";

import ChartTable from "../ChartTable/ChartTable";
import ChartTooltip from "../ChartTooltip/ChartTooltip";
import ChartTooltipRow from "../ChartTooltipRow/ChartTooltipRow";

import styles from "./BalanceLine.module.scss";

export interface BalancePoint {
  date: string;
  value: number;
  change: number;
}

interface BalanceLineProps {
  points: BalancePoint[];
  currency: Currency;
  caption: string;
  dateLabel: string;
  valueLabel: string;
  changeLabel: string;
  height?: number;
}

// Room around the plot for the axis labels
const PAD = { top: 10, right: 12, bottom: 22, left: 48 };

// Whether a day gets a date label: the ends and every seventh day clear of the end
const labelled = (index: number, count: number): boolean =>
  index === 0 || index === count - 1 || (index % 7 === 0 && count - 1 - index >= 4);

// A projected balance by day, a red zero line when crossed and the lowest marked
const BalanceLine = ({
  points,
  currency,
  caption,
  dateLabel,
  valueLabel,
  changeLabel,
  height = 150,
}: BalanceLineProps) => {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gradient = `bal-${useId().replaceAll(/[^a-zA-Z0-9]/gu, "")}`;

  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = height - PAD.top - PAD.bottom;
  const values = points.map((point) => point.value);
  const low = Math.min(0, ...values);
  // Above zero the axis hugs the balance so a dip shows; below, it starts there
  const ticksUp =
    low < 0 ? niceTicks(Math.max(0, ...values) || 1, 3) : niceRange(Math.min(...values), Math.max(...values));
  const top = ticksUp.at(-1) ?? 1;
  const bottom = low < 0 ? -(niceTicks(-low, 2).at(-1) ?? 0) : (ticksUp[0] ?? 0);
  const ticks = [...(low < 0 ? [bottom] : []), ...ticksUp];
  const tickLabel = axisFormatter(Math.max(top, -bottom));
  // The horizontal position of a day
  const x = (index: number) => PAD.left + (points.length > 1 ? (index / (points.length - 1)) * plotWidth : 0);
  // The vertical position of a balance
  const y = (value: number) => PAD.top + ((top - value) / (top - bottom || 1)) * plotHeight;
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`)
    .join("");
  const lowest = points.reduce((best, point, index) => (point.value < (points[best]?.value ?? 0) ? index : best), 0);
  const lowestValue = points[lowest]?.value ?? 0;
  const color = lowestValue < 0 ? "var(--color-expense)" : "var(--color-accent)";
  // A balance in short form, signed for changes
  const money = (value: number, sign = false) => formatMoney(value, currency, { compact: true, sign });
  const hovered = hover === null ? undefined : points[hover];

  return (
    <div>
      <ChartTable
        caption={caption}
        columns={[dateLabel, valueLabel, changeLabel]}
        rows={points.map((point) => ({
          key: point.date,
          cells: [formatDateShort(point.date), money(point.value), money(point.change, true)],
        }))}
      />
      <div ref={ref} className={styles.plot} style={{ height }}>
        {width > 0 && points.length > 1 && (
          <svg width={width} height={height} aria-hidden>
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.16} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            {ticks.map((tick) => {
              const zero = tick === 0 && bottom < 0;
              return (
                <g key={tick}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={y(tick)}
                    y2={y(tick)}
                    stroke={zero ? "var(--color-expense)" : "var(--color-chart-grid)"}
                    strokeOpacity={zero ? 0.5 : 1}
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
              );
            })}
            {points.map((point, index) => {
              if (!labelled(index, points.length)) return null;
              let anchor: "start" | "middle" | "end" = "middle";
              if (index === 0) anchor = "start";
              else if (index === points.length - 1) anchor = "end";
              return (
                <text
                  key={point.date}
                  x={x(index)}
                  y={height - 6}
                  textAnchor={anchor}
                  fontSize={11}
                  fill="var(--color-text-tertiary)"
                >
                  {formatDateShort(point.date)}
                </text>
              );
            })}
            <path
              d={`${line}L${String(x(points.length - 1))},${String(y(bottom))}L${String(x(0))},${String(y(bottom))}Z`}
              fill={`url(#${gradient})`}
            />
            <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <circle
              cx={x(lowest)}
              cy={y(lowestValue)}
              r={4}
              fill={color}
              stroke="var(--glass-tint-strong)"
              strokeWidth={2}
            />
            {hover !== null && (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={PAD.top + plotHeight}
                stroke="var(--color-text-tertiary)"
                strokeWidth={1}
                opacity={0.6}
              />
            )}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={plotWidth}
              height={plotHeight}
              fill="transparent"
              onPointerMove={(event) => {
                const box = event.currentTarget.getBoundingClientRect();
                const index = Math.round(((event.clientX - box.left) / Math.max(1, box.width)) * (points.length - 1));
                setHover(Math.max(0, Math.min(points.length - 1, index)));
              }}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}
        {hovered && hover !== null && (
          <ChartTooltip x={x(hover)} y={PAD.top} containerWidth={width}>
            <p className={styles.tooltipTitle}>
              {formatWeekday(hovered.date)}, {formatDateShort(hovered.date)}
            </p>
            <ChartTooltipRow color={color} label={valueLabel} value={money(hovered.value)} />
            {hovered.change !== 0 && <ChartTooltipRow label={changeLabel} value={money(hovered.change, true)} />}
          </ChartTooltip>
        )}
      </div>
    </div>
  );
};

export default BalanceLine;
