"use client";

import { useStore } from "@/app/hooks";
import { todayWeekday, weekdaySpending } from "@/features/calendar/model/weekdays";
import { useI18n } from "@/shared/i18n/useI18n";
import { addDays, formatWeekday, formatWeekdayLong } from "@/shared/lib/date";
import { formatCompact, formatMoney } from "@/shared/lib/money";
import BarRow from "@/shared/ui/BarRow/BarRow";
import Card from "@/shared/ui/Card/Card";

import styles from "./WeekdaysCard.module.scss";

interface WeekdaysCardProps {
  today: string;
}

// What each weekday costs on average, the dearest named and in bold
const WeekdaysCard = ({ today }: WeekdaysCardProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const base = state.settings.baseCurrency;
  const days = weekdaySpending(state, today);
  const peak = days.reduce(
    (best, day) => (day.average > best.average ? day : best),
    days[0] ?? { weekday: 0, average: 0 },
  );
  if (peak.average <= 0) return null;
  // A date that falls on a weekday, Monday first, for its name
  const dateOf = (weekday: number) => addDays(today, weekday - todayWeekday(today));
  return (
    <Card title={t("calendar.weekdays")} subtitle={t("calendar.weekdays.subtitle")} icon="calendar">
      <p className={styles.peak}>
        {t("calendar.weekdays.most", {
          day: formatWeekdayLong(dateOf(peak.weekday)),
          amount: formatMoney(peak.average, base, { compact: true }),
        })}
      </p>
      <BarRow
        caption={t("calendar.weekdays")}
        columns={[t("chart.point"), t("common.amount")]}
        tone="expense"
        height={130}
        bars={days.map((day) => ({
          key: String(day.weekday),
          label: formatWeekday(dateOf(day.weekday)),
          value: day.average,
          display: formatCompact(day.average),
          strong: day.weekday === peak.weekday,
        }))}
      />
    </Card>
  );
};

export default WeekdaysCard;
