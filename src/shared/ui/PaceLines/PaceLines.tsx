"use client";

import { useId, useState } from "react";

import { useMeasure } from "@/shared/hooks/useMeasure";
import { useI18n } from "@/shared/i18n/useI18n";
import { axisFormatter, niceTicks } from "@/shared/lib/chart";
import { type Currency, formatMoney } from "@/shared/lib/money";

import ChartLegend from "../ChartLegend/ChartLegend";
import ChartTable from "../ChartTable/ChartTable";
import ChartTooltip from "../ChartTooltip/ChartTooltip";
import ChartTooltipRow from "../ChartTooltipRow/ChartTooltipRow";

import styles from "./PaceLines.module.scss";

interface PaceLinesProps {
  current: number[];
  previous: number[];
  days: number;
  currency: Currency;
  currentLabel: string;
  previousLabel: string;
  caption: string;
  dayLabel: (day: number) => string;
  color?: string;
  height?: number;
}

// Room around the plot for the axis labels
const PAD = { top: 10, right: 12, bottom: 22, left: 44 };

// What a table cell says for a day without a figure
const NO_FIGURE = "-";

// Whether a day gets a label: the first, every fifth, and a last one clear of them
const labelled = (index: number, days: number): boolean =>
  index === 0 || (index + 1) % 5 === 0 || (index === days - 1 && days % 5 >= 3);

// A month's running total day by day against the month before
const PaceLines = ({
  current,
  previous,
  days,
  currency,
  currentLabel,
  previousLabel,
  caption,
  dayLabel,
  color = "var(--color-expense)",
  height = 180,
}: PaceLinesProps) => {
  const { t } = useI18n();
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gradient = `pace-${useId().replaceAll(/[^a-zA-Z0-9]/gu, "")}`;

  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = height - PAD.top - PAD.bottom;
  const ticks = niceTicks(Math.max(1, ...current, ...previous));
  const top = ticks.at(-1) ?? 1;
  const tickLabel = axisFormatter(top);
  // The horizontal position of a day
  const x = (index: number) => PAD.left + (days > 1 ? (index / (days - 1)) * plotWidth : 0);
  // The vertical position of a total
  const y = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight;
  // The line through a list of totals
  const path = (values: number[]) =>
    values.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join("");
  const last = current.length - 1;
  const lastValue = current.at(-1);
  // A total in short form
  const money = (value: number) => formatMoney(value, currency, { compact: true });
  // A day's figure for the table, or a dash past the end of the list
  const cell = (values: number[], index: number) => {
    const value = values[index];
    return value === undefined ? NO_FIGURE : money(value);
  };
  const hoveredCurrent = hover === null ? undefined : current[hover];
  const hoveredPrevious = hover === null ? undefined : previous[hover];

  return (
    <div>
      <ChartLegend
        items={[
          { label: currentLabel, color },
          { label: previousLabel, color: "var(--color-text-tertiary)" },
        ]}
      />
      <ChartTable
        caption={caption}
        columns={[t("common.date"), currentLabel, previousLabel]}
        rows={Array.from({ length: days }, (_, index) => ({
          key: String(index),
          cells: [dayLabel(index + 1), cell(current, index), cell(previous, index)],
        }))}
      />
      <div ref={ref} className={styles.plot} style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} aria-hidden>
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.16} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
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
            {Array.from({ length: days }, (_, index) =>
              labelled(index, days) ? (
                <text
                  key={index}
                  x={x(index)}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize={11}
                  className={styles.figure}
                  fill="var(--color-text-tertiary)"
                >
                  {index + 1}
                </text>
              ) : null,
            )}
            {previous.length > 1 && (
              <path
                d={path(previous)}
                fill="none"
                stroke="var(--color-text-tertiary)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.55}
              />
            )}
            {current.length > 1 && (
              <>
                <path
                  d={`${path(current)}L${String(x(last))},${String(y(0))}L${String(x(0))},${String(y(0))}Z`}
                  fill={`url(#${gradient})`}
                />
                <path
                  d={path(current)}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </>
            )}
            {lastValue !== undefined && (
              <circle
                cx={x(last)}
                cy={y(lastValue)}
                r={4}
                fill={color}
                stroke="var(--glass-tint-strong)"
                strokeWidth={2}
              />
            )}
            {hover !== null && (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={y(0)}
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
                const index = Math.round(((event.clientX - box.left) / Math.max(1, box.width)) * (days - 1));
                setHover(Math.max(0, Math.min(days - 1, index)));
              }}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}
        {hover !== null && (
          <ChartTooltip x={x(hover)} y={PAD.top} containerWidth={width}>
            <p className={styles.tooltipTitle}>{dayLabel(hover + 1)}</p>
            {hoveredCurrent !== undefined && (
              <ChartTooltipRow color={color} label={currentLabel} value={money(hoveredCurrent)} />
            )}
            {hoveredPrevious !== undefined && (
              <ChartTooltipRow
                color="var(--color-text-tertiary)"
                label={previousLabel}
                value={money(hoveredPrevious)}
              />
            )}
          </ChartTooltip>
        )}
      </div>
    </div>
  );
};

export default PaceLines;
