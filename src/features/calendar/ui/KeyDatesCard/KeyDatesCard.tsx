"use client";

import type { DayEvent } from "@/features/calendar/model/monthEvents";
import EventRow from "@/features/calendar/ui/EventRow/EventRow";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDateShort, formatMonth } from "@/shared/lib/date";
import Card from "@/shared/ui/Card/Card";

import styles from "./KeyDatesCard.module.scss";

interface KeyDatesCardProps {
  month: string;
  dates: DayEvent[];
  onPick: (date: string) => void;
}

// The month's deadlines, maturities, loans and wishes; a tap opens the day
const KeyDatesCard = ({ month, dates, onPick }: KeyDatesCardProps) => {
  const { t } = useI18n();
  if (dates.length === 0) return null;
  return (
    <Card title={t("calendar.keyDates")} subtitle={formatMonth(month)} icon="target">
      <ul className={styles.rows}>
        {dates.map((event) => (
          <EventRow
            key={event.id}
            event={{ ...event, subtitle: [formatDateShort(event.date), event.subtitle].filter(Boolean).join(" · ") }}
            onOpen={() => onPick(event.date)}
          />
        ))}
      </ul>
    </Card>
  );
};

export default KeyDatesCard;
