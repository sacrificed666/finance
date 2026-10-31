"use client";

import { KIND_COLOR, LEGEND_KINDS, type DaySummary } from "@/features/calendar/model/monthEvents";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDate, formatWeekday } from "@/shared/lib/date";
import { formatMoney, type Currency } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";

import styles from "./MonthGrid.module.scss";

// A Monday-to-Sunday week, for the names of the weekdays
const WEEK = Array.from({ length: 7 }, (_, index) => `2024-01-0${String(index + 1)}`);

interface MonthGridProps {
  month: string;
  days: DaySummary[];
  today: string;
  selected: string;
  currency: Currency;
  onPick: (date: string) => void;
}

// The month's days, shaded by spending and dotted by their events
const MonthGrid = ({ month, days, today, selected, currency, onPick }: MonthGridProps) => {
  const { t, tp } = useI18n();
  const offset = (new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7;
  const maxSpend = Math.max(1, ...days.map((day) => day.spent));
  // Only the kinds this month has, so the key never names what is not there
  const present = new Set(days.flatMap((day) => day.events.map((event) => event.kind)));
  const legend = LEGEND_KINDS.filter((kind) => present.has(kind));

  // The look of a day: picked, past or ahead
  const dayClass = (date: string) => {
    if (date === selected) return styles.picked;
    return date < today ? styles.past : styles.ahead;
  };
  // The look of a day's number: today, past or ahead
  const numberClass = (date: string) => {
    if (date === today) return styles.today;
    return date < today ? styles.pastNumber : styles.aheadNumber;
  };

  return (
    <Card title={t("calendar.month")} subtitle={t("calendar.month.subtitle")} icon="calendar">
      <div className={styles.grid}>
        {WEEK.map((date) => (
          <span key={date} className={styles.weekday}>
            {formatWeekday(date)}
          </span>
        ))}
        {Array.from({ length: offset }, (_, index) => (
          <span key={`pad-${String(index)}`} aria-hidden />
        ))}
        {days.map((day) => {
          const kinds = [...new Set(day.events.map((event) => event.kind))].slice(0, 4);
          const count = day.events.length > 0 ? ` · ${tp("common.entries", day.events.length)}` : "";
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onPick(day.date)}
              aria-pressed={day.date === selected}
              aria-label={`${formatDate(day.date)}${count}`}
              className={cx(styles.day, dayClass(day.date))}
            >
              {day.spent > 0 && (
                <span
                  aria-hidden
                  className={styles.spend}
                  style={{ height: `${String(Math.max(8, (day.spent / maxSpend) * 70))}%` }}
                />
              )}
              <span className={cx(styles.number, numberClass(day.date))}>{Number(day.date.slice(8))}</span>
              <span className={styles.dots}>
                {kinds.map((kind) => (
                  <span key={kind} aria-hidden className={styles.dot} style={{ background: KIND_COLOR[kind] }} />
                ))}
              </span>
              {day.net !== 0 && (
                <span className={cx(styles.net, day.net > 0 ? styles.gain : styles.loss)}>
                  {formatMoney(day.net, currency, { compact: true, sign: true })}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {legend.length > 0 && (
        <ul className={styles.legend}>
          {legend.map((kind) => (
            <li key={kind} className={styles.kind}>
              <span aria-hidden className={styles.swatch} style={{ background: KIND_COLOR[kind] }} />
              {t(`calendar.kind.${kind}`)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default MonthGrid;
