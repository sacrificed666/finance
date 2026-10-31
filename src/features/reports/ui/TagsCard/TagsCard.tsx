"use client";

import { useI18n } from "@/shared/i18n/useI18n";
import { formatMoney, type Currency } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";

import styles from "./TagsCard.module.scss";

interface TagsCardProps {
  byTag: ReadonlyMap<string, number>;
  period: string;
  currency: Currency;
}

// The period's spending by tag, the largest first
const TagsCard = ({ byTag, period, currency }: TagsCardProps) => {
  const { t } = useI18n();
  const tags = [...byTag].toSorted((a, b) => b[1] - a[1]);
  if (tags.length === 0) return null;
  return (
    <Card title={t("reports.tags")} subtitle={period} icon="tag">
      <ul className={styles.rows}>
        {tags.map(([tag, value]) => (
          <li key={tag} className={styles.row}>
            <span className={styles.tag}>#{tag}</span>
            <span className={styles.value}>{formatMoney(value, currency, { compact: true })}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default TagsCard;
