"use client";

import type { CategoryChange, Report } from "@/features/reports/model/report";
import { useReportLabels } from "@/features/reports/model/useReportLabels";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatMoney, type Currency } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import SparkArea from "@/shared/ui/SparkArea/SparkArea";

import styles from "./TrendsCard.module.scss";

interface TrendsCardProps {
  r: Report;
  spent: CategoryChange[];
  currency: Currency;
}

// Columns by the number of tiles, so every row is full or one short at most
const COLUMNS: Partial<Record<number, number>> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 3, 6: 3 };

// The last month against earlier months with spending, or new without any
const versus = (trend: number[]): { delta: number; fresh: boolean } => {
  const earlier = trend.slice(0, -1).filter((value) => value > 0);
  const average = earlier.reduce((sum, value) => sum + value, 0) / Math.max(1, earlier.length);
  const delta = (trend.at(-1) ?? 0) - average;
  return { delta: Math.abs(delta) < average * 0.01 ? 0 : delta, fresh: earlier.length === 0 };
};

// The largest categories over a year, the last month against their average
const TrendsCard = ({ r, spent, currency }: TrendsCardProps) => {
  const { t } = useI18n();
  const { categoryMark } = useReportLabels();
  if (spent.length === 0) return null;
  // A short amount in the base currency
  const money = (amount: number, sign = false) => formatMoney(amount, currency, { compact: true, sign });
  const shown = spent.slice(0, 6);
  const columns = COLUMNS[shown.length] ?? 3;
  // The last tile stretches over the columns its row leaves empty
  const stretch = {
    "--span": columns - ((shown.length - 1) % columns),
    "--span-phone": shown.length % 2 === 1 ? 2 : 1,
  };

  return (
    <Card title={t("reports.trends")} subtitle={t("reports.trends.subtitle")} icon="trend">
      <ul className={styles.grid} style={{ "--cols": columns, ...stretch }}>
        {shown.map((entry) => {
          const trend = r.trendOf(entry.id);
          const last = trend.at(-1) ?? 0;
          const { delta, fresh } = versus(trend);
          const { icon, name } = categoryMark(entry.id);
          let note = t("reports.vsAvg", { delta: money(delta, true) });
          if (fresh) note = t("reports.new");
          else if (delta === 0) note = t("reports.onAvg");
          return (
            <li key={entry.id} className={styles.tile}>
              <p className={styles.head}>
                <span aria-hidden>{icon}</span>
                <span className={styles.name}>{name}</span>
              </p>
              <p className={styles.value}>{money(last)}</p>
              <p className={cx(styles.note, (fresh || delta > 0) && styles.above, delta < 0 && styles.below)}>{note}</p>
              <SparkArea values={trend} tone="expense" height={40} />
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default TrendsCard;
