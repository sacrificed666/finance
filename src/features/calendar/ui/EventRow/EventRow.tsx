"use client";

import { KIND_COLOR, type DayEvent } from "@/features/calendar/model/monthEvents";
import { cx } from "@/shared/lib/cx";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import Money from "@/shared/ui/Money/Money";

import styles from "./EventRow.module.scss";

interface EventRowProps {
  event: DayEvent;
  onOpen?: () => void;
}

// The colour of an event's amount
const TONE: Partial<Record<DayEvent["kind"], string | undefined>> = { expense: styles.expense, income: styles.income };

// One event: its kind's dot, its emoji, its title and its amount
const EventRow = ({ event, onOpen }: EventRowProps) => {
  const counted = event.kind === "expense" || event.kind === "income";
  const body = (
    <>
      <span aria-hidden className={styles.dot} style={{ background: KIND_COLOR[event.kind] }} />
      <IconDisc size="md">{event.icon}</IconDisc>
      <span className={styles.text}>
        <span className={styles.title}>{event.title}</span>
        {event.subtitle && <span className={styles.subtitle}>{event.subtitle}</span>}
      </span>
      {event.amount !== undefined && event.currency && (
        <Money
          amount={event.kind === "expense" ? -event.amount : event.amount}
          currency={event.currency}
          sign={counted}
          compact
          className={cx(styles.amount, TONE[event.kind] ?? styles.plain)}
        />
      )}
    </>
  );
  return (
    <li>
      {onOpen ? (
        <button type="button" onClick={onOpen} className={styles.button}>
          {body}
        </button>
      ) : (
        <div className={styles.row}>{body}</div>
      )}
    </li>
  );
};

export default EventRow;
