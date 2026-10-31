"use client";

import { FLOW_KEPT, FLOW_OTHER, FLOW_SAVINGS, moneyFlow } from "@/features/reports/model/flow";
import { flowLayout, type FlowBox } from "@/features/reports/model/flowLayout";
import type { Report } from "@/features/reports/model/report";
import { useReportLabels } from "@/features/reports/model/useReportLabels";
import { useMeasure } from "@/shared/hooks/useMeasure";
import { useI18n } from "@/shared/i18n/useI18n";
import { seriesColor } from "@/shared/lib/chart";
import { formatMoney, formatPercent, type Currency } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import ChartTable from "@/shared/ui/ChartTable/ChartTable";

import styles from "./FlowCard.module.scss";

interface FlowCardProps {
  r: Report;
  period: string;
  currency: Currency;
}

// The least height of the drawing, and the room each name takes in its column
const HEIGHT = 240;
const ROW = 46;

// How the period's income flowed into each category and what was kept, as bands
const FlowCard = ({ r, period, currency }: FlowCardProps) => {
  const { t } = useI18n();
  const { categoryMark } = useReportLabels();
  const [ref, width] = useMeasure<HTMLDivElement>();
  const flow = moneyFlow(r);
  if (!flow) return null;
  const height = Math.max(HEIGHT, Math.max(flow.sources.length, flow.uses.length) * ROW);
  const layout = flowLayout(flow, width, height);
  // A short amount in the base currency
  const money = (amount: number) => formatMoney(amount, currency, { compact: true });
  // The name, mark and colour of a part
  const part = (id: string) => {
    if (id === FLOW_KEPT) return { name: t("reports.flow.kept"), icon: "🌱", color: "var(--color-income)" };
    if (id === FLOW_SAVINGS) return { name: t("reports.flow.savings"), icon: "🏦", color: "var(--color-expense)" };
    if (id === FLOW_OTHER) return { name: t("chart.other"), icon: "•", color: "var(--color-text-tertiary)" };
    const { name, icon, slot } = categoryMark(id);
    return { name, icon, color: seriesColor(slot ?? 3) };
  };
  // A part's name and amount beside its node
  const label = (box: FlowBox, side: "in" | "out") => {
    const { name, icon } = part(box.id);
    return (
      <span
        key={`${side}:${box.id}`}
        className={side === "in" ? styles.labelIn : styles.labelOut}
        style={{
          top: box.label - 18,
          width: layout.columns.label - 10,
          left: side === "in" ? 0 : layout.columns.right + layout.columns.node + 10,
        }}
      >
        <span className={styles.name}>
          <span aria-hidden>{icon}</span> {name}
        </span>
        <span className={styles.amount}>{money(box.value)}</span>
      </span>
    );
  };

  return (
    <Card
      title={t("reports.flow")}
      subtitle={
        r.current.income > r.current.expense
          ? t("reports.flow.subtitle", {
              period,
              kept: formatPercent(((r.current.income - r.current.expense) / r.current.income) * 100, 0),
            })
          : period
      }
      icon="exchange"
    >
      <div ref={ref} aria-hidden className={styles.plot} style={{ height }}>
        {width > 0 && (
          <>
            <svg width={width} height={height} className={styles.svg}>
              {layout.bands.map((band) => (
                <path
                  key={`${band.side}:${band.id}`}
                  d={band.path}
                  className={styles.band}
                  style={{ "--band": part(band.id).color }}
                />
              ))}
              {layout.sources.map((box) => (
                <rect
                  key={box.id}
                  x={layout.columns.left}
                  y={box.top}
                  width={layout.columns.node}
                  height={box.height}
                  rx={3}
                  fill={part(box.id).color}
                />
              ))}
              <rect
                x={layout.columns.middle}
                y={layout.middle.top}
                width={layout.columns.node}
                height={layout.middle.height}
                rx={3}
                className={styles.pool}
              />
              {layout.uses.map((box) => (
                <rect
                  key={box.id}
                  x={layout.columns.right}
                  y={box.top}
                  width={layout.columns.node}
                  height={box.height}
                  rx={3}
                  fill={part(box.id).color}
                />
              ))}
            </svg>
            {layout.sources.map((box) => label(box, "in"))}
            {layout.uses.map((box) => label(box, "out"))}
          </>
        )}
      </div>
      <ChartTable
        caption={t("reports.flow")}
        columns={[t("common.name"), t("common.amount")]}
        rows={[...flow.sources, ...flow.uses].map((entry, index) => ({
          key: `${String(index)}:${entry.id}`,
          cells: [part(entry.id).name, money(entry.value)],
        }))}
      />
    </Card>
  );
};

export default FlowCard;
