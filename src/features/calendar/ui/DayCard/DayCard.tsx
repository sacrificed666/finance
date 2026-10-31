"use client";

import type { DaySummary } from "@/features/calendar/model/monthEvents";
import EventRow from "@/features/calendar/ui/EventRow/EventRow";
import type { Transaction } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDate, formatWeekday } from "@/shared/lib/date";
import { formatMoney, type Currency } from "@/shared/lib/money";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Card from "@/shared/ui/Card/Card";
import SummaryPanel from "@/shared/ui/SummaryPanel/SummaryPanel";

import styles from "./DayCard.module.scss";

interface DayCardProps {
  day: DaySummary;
  today: string;
  currency: Currency;
  onAdd: () => void;
  onOpen: (tx: Transaction) => void;
}

// The picked day: what it nets and every event on it
const DayCard = ({ day, today, currency, onAdd, onOpen }: DayCardProps) => {
  const { t, tp } = useI18n();
  const entries = day.events.filter((event) => event.tx).length;
  let subtitle: string | undefined;
  if (day.date === today) subtitle = t("calendar.today");
  else if (day.date > today) subtitle = t("calendar.ahead");
  let tone: "income" | "expense" | undefined;
  if (day.net > 0) tone = "income";
  else if (day.net < 0) tone = "expense";

  return (
    <Card
      title={`${formatWeekday(day.date)}, ${formatDate(day.date)}`}
      subtitle={subtitle}
      icon="calendar"
      action={<AddButton size="sm" onClick={onAdd} label={t("common.add")} />}
    >
      {day.events.length > 0 ? (
        <>
          {entries > 0 && (
            <SummaryPanel
              className={styles.summary}
              value={formatMoney(day.net, currency, { sign: true })}
              tone={tone}
              meta={tp("common.entries", entries)}
            />
          )}
          <ul className={styles.rows}>
            {day.events.map((event) => {
              const tx = event.tx;
              return <EventRow key={event.id} event={event} onOpen={tx ? () => onOpen(tx) : undefined} />;
            })}
          </ul>
        </>
      ) : (
        <p className={styles.quiet}>{t("calendar.quiet")}</p>
      )}
    </Card>
  );
};

export default DayCard;
