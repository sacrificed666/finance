"use client";

import { useState } from "react";

import { useMeasure } from "@/shared/hooks/useMeasure";
import { useI18n } from "@/shared/i18n/useI18n";
import { axisFormatter, niceTicks } from "@/shared/lib/chart";
import { formatMonthShort } from "@/shared/lib/date";
import { type Currency, formatMoney } from "@/shared/lib/money";

import ChartColumn from "../ChartColumn/ChartColumn";
import ChartLegend, { type LegendItem } from "../ChartLegend/ChartLegend";
import ChartTable from "../ChartTable/ChartTable";
import ChartTooltip from "../ChartTooltip/ChartTooltip";
import ChartTooltipRow from "../ChartTooltipRow/ChartTooltipRow";

import styles from "./MonthlyColumns.module.scss";

export interface MonthPoint {
  month: string;
  income: number;
  expense: number;
  tax?: number;
}

interface MonthlyColumnsProps {
  data: MonthPoint[];
  currency: Currency;
  height?: number;
  incomeOnly?: boolean;
}

// Room around the plot for the axis labels
const PAD = { top: 8, right: 8, bottom: 22, left: 44 };

// Income and expenses side by side each month, or income with its tax on top
const MonthlyColumns = ({ data, currency, height = 190, incomeOnly = false }: MonthlyColumnsProps) => {
  const { t } = useI18n();
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const withTax = incomeOnly && data.some((point) => (point.tax ?? 0) > 0);
  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = height - PAD.top - PAD.bottom;
  // A month's column height: income with tax, or the larger of income and expenses
  const peak = (point: MonthPoint) =>
    incomeOnly ? point.income + (withTax ? (point.tax ?? 0) : 0) : Math.max(point.income, point.expense);
  const ticks = niceTicks(Math.max(1, ...data.map(peak)));
  const top = ticks.at(-1) ?? 1;
  const tickLabel = axisFormatter(top);
  // The vertical position of an amount
  const y = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight;

  const band = data.length > 0 ? plotWidth / data.length : 0;
  const barWidth = incomeOnly
    ? Math.max(1.5, Math.min(24, band - Math.max(4, band * 0.35)))
    : Math.max(1.5, Math.min(24, (band - Math.min(4, band * 0.25)) / 2 - 1));
  const barGap = Math.min(2, band * 0.06);
  const labelStep = Math.max(1, Math.ceil(28 / Math.max(1, band)));

  let legend: LegendItem[] = [
    { label: t("tx.stat.income"), color: "var(--color-income)" },
    { label: t("tx.stat.expenses"), color: "var(--color-expense)" },
  ];
  if (incomeOnly) {
    legend = withTax
      ? [
          { label: t("tx.stat.income"), color: "var(--color-income)" },
          { label: t("income.tax"), color: "var(--color-expense)" },
        ]
      : [];
  }
  const columns = incomeOnly
    ? [t("chart.month"), t("tx.stat.income"), ...(withTax ? [t("income.tax")] : [])]
    : [t("chart.month"), t("tx.stat.income"), t("tx.stat.expenses"), t("tx.stat.net")];
  // An amount in short form, signed for the net
  const money = (value: number, sign = false) => formatMoney(value, currency, { compact: true, sign });
  const hovered = hover === null ? undefined : data[hover];

  return (
    <div>
      {legend.length > 0 && <ChartLegend items={legend} />}
      <ChartTable
        caption={t("chart.columns.caption")}
        columns={columns}
        rows={data.map((point) => ({
          key: point.month,
          cells: incomeOnly
            ? [formatMonthShort(point.month), money(point.income), ...(withTax ? [money(point.tax ?? 0)] : [])]
            : [
                formatMonthShort(point.month),
                money(point.income),
                money(point.expense),
                money(point.income - point.expense, true),
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
            {data.map((point, index) => {
              const center = PAD.left + band * index + band / 2;
              const tax = withTax ? (point.tax ?? 0) : 0;
              return (
                <g key={point.month} className={hover !== null && hover !== index ? styles.dimmed : styles.month}>
                  {incomeOnly ? (
                    <>
                      <ChartColumn
                        x={center - barWidth / 2}
                        w={barWidth}
                        y0={y(0)}
                        y1={y(point.income)}
                        color="var(--color-income)"
                        index={index}
                        rounded={tax <= 0}
                      />
                      {tax > 0 && (
                        <ChartColumn
                          x={center - barWidth / 2}
                          w={barWidth}
                          y0={y(point.income) - 2}
                          y1={y(point.income + tax) - 2}
                          color="var(--color-expense)"
                          index={index}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <ChartColumn
                        x={center - barWidth - barGap / 2}
                        w={barWidth}
                        y0={y(0)}
                        y1={y(point.income)}
                        color="var(--color-income)"
                        index={index}
                      />
                      <ChartColumn
                        x={center + barGap / 2}
                        w={barWidth}
                        y0={y(0)}
                        y1={y(point.expense)}
                        color="var(--color-expense)"
                        index={index}
                      />
                    </>
                  )}
                  {(data.length - 1 - index) % labelStep === 0 && (
                    <text x={center} y={height - 6} textAnchor="middle" fontSize={11} fill="var(--color-text-tertiary)">
                      {formatMonthShort(point.month)}
                    </text>
                  )}
                </g>
              );
            })}
            {data.map((point, index) => (
              <rect
                key={point.month}
                x={PAD.left + band * index}
                y={PAD.top}
                width={band}
                height={plotHeight}
                fill="transparent"
                onPointerMove={() => setHover(index)}
                onPointerLeave={() => setHover(null)}
              />
            ))}
          </svg>
        )}
        {hovered && hover !== null && (
          <ChartTooltip x={PAD.left + band * hover + band / 2} y={PAD.top} containerWidth={width}>
            <p className={styles.tooltipTitle}>{formatMonthShort(hovered.month)}</p>
            <ChartTooltipRow color="var(--color-income)" label={t("tx.stat.income")} value={money(hovered.income)} />
            {incomeOnly ? (
              withTax &&
              (hovered.tax ?? 0) > 0 && (
                <>
                  <ChartTooltipRow
                    color="var(--color-expense)"
                    label={t("income.tax")}
                    value={money(hovered.tax ?? 0)}
                  />
                  <ChartTooltipRow label={t("income.gross")} value={money(hovered.income + (hovered.tax ?? 0))} />
                </>
              )
            ) : (
              <>
                <ChartTooltipRow
                  color="var(--color-expense)"
                  label={t("tx.stat.expenses")}
                  value={money(hovered.expense)}
                />
                <ChartTooltipRow label={t("tx.stat.net")} value={money(hovered.income - hovered.expense, true)} />
              </>
            )}
          </ChartTooltip>
        )}
      </div>
    </div>
  );
};

export default MonthlyColumns;
