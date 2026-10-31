"use client";

import type { WeekSummary } from "@/features/calendar/model/monthEvents";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDateShort } from "@/shared/lib/date";
import { formatMoney, type Currency } from "@/shared/lib/money";
import Badge from "@/shared/ui/Badge/Badge";
import Card from "@/shared/ui/Card/Card";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";

import styles from "./WeeksCard.module.scss";

interface WeeksCardProps {
  weeks: WeekSummary[];
  today: string;
  currency: Currency;
  onPick: (date: string) => void;
}

// The month week by week: what went out against the busiest week; a tap opens it
const WeeksCard = ({ weeks, today, currency, onPick }: WeeksCardProps) => {
  const { t } = useI18n();
  const busiest = Math.max(0, ...weeks.map((week) => week.spent));
  if (weeks.every((week) => week.entries === 0)) return null;
  // A short amount in the base currency
  const money = (amount: number, sign = false) => formatMoney(amount, currency, { compact: true, sign });

  return (
    <Card title={t("calendar.weeks")} subtitle={t("calendar.weeks.subtitle")} icon="spend">
      <ul className={styles.rows}>
        {weeks.map((week) => {
          const range = t("calendar.weekRange", { from: formatDateShort(week.from), to: formatDateShort(week.to) });
          const current = week.from <= today && today <= week.to;
          return (
            <li key={week.from}>
              <button type="button" onClick={() => onPick(current ? today : week.from)} className={styles.row}>
                <span className={styles.line}>
                  <span className={styles.range}>{range}</span>
                  {current && <Badge tone="accent">{t("calendar.thisWeek")}</Badge>}
                  <span className={cx(styles.spent, week.spent > 0.5 && styles.out)}>
                    {money(week.spent > 0.5 ? -week.spent : 0)}
                  </span>
                </span>
                <span className={styles.line}>
                  <span className={styles.meter}>
                    <ProgressMeter value={week.spent} max={busiest} tone="expense" label={range} />
                  </span>
                  {week.earned > 0.5 && (
                    <span className={styles.earned}>{t("calendar.weekIn", { amount: money(week.earned, true) })}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default WeeksCard;
