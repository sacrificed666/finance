"use client";

import type { Report } from "@/features/reports/model/report";
import { useReportLabels } from "@/features/reports/model/useReportLabels";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDateShort } from "@/shared/lib/date";
import Card from "@/shared/ui/Card/Card";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import Money from "@/shared/ui/Money/Money";

import styles from "./LargestCard.module.scss";

interface LargestCardProps {
  largest: Report["largest"];
  period: string;
}

// The period's five largest spendings
const LargestCard = ({ largest, period }: LargestCardProps) => {
  const { t } = useI18n();
  const { categoryMark } = useReportLabels();
  if (largest.length === 0) return null;
  return (
    <Card title={t("reports.largest")} subtitle={period} icon="receipt">
      <ul className={styles.rows}>
        {largest.map(({ tx }) => {
          const { icon, name, slot } = categoryMark(tx.categoryId);
          return (
            <li key={tx.id} className={styles.row}>
              <IconDisc colorSlot={slot} size="md">
                {icon}
              </IconDisc>
              <span className={styles.text}>
                <span className={styles.name}>{tx.note?.trim() ? tx.note : name}</span>
                <span className={styles.date}>{formatDateShort(tx.date)}</span>
              </span>
              <Money amount={-tx.amount} currency={tx.currency} sign compact className={styles.amount} />
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default LargestCard;
