"use client";

import { useState } from "react";

import { displayCurrencies } from "@/features/data/model/currencies";
import type { PlannedEvent } from "@/features/data/model/types";
import {
  blankEventDraft,
  byMonth,
  eventDraftOf,
  savePlannedEvent,
  type EventDraft,
} from "@/features/forecast/model/events";
import type { Forecast } from "@/features/forecast/model/forecast";
import EventSheet from "@/features/forecast/ui/EventSheet/EventSheet";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatMonthCompact } from "@/shared/lib/date";
import { convert, formatMoney } from "@/shared/lib/money";
import { uid } from "@/shared/lib/uid";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Card from "@/shared/ui/Card/Card";

import styles from "./EventsCard.module.scss";

interface EventsCardProps {
  f: Forecast;
  events: PlannedEvent[];
  onChange: (events: PlannedEvent[], undoLabel?: string) => void;
}

// One-off sums in or out that the forecast takes into account
const EventsCard = ({ f, events, onChange }: EventsCardProps) => {
  const { t } = useI18n();
  const [sheet, setSheet] = useState<PlannedEvent | "new" | null>(null);

  // Saves a draft over the event in the sheet, or as a new one, and closes it
  const save = (target: PlannedEvent | "new", draft: EventDraft) => {
    const next = savePlannedEvent(events, draft, target, uid);
    if (next) onChange(next);
    setSheet(null);
  };

  // Deletes an event with an undo and closes its sheet
  const remove = (target: PlannedEvent) => {
    onChange(
      events.filter((item) => item.id !== target.id),
      t("forecast.events.deleted"),
    );
    setSheet(null);
  };

  return (
    <Card
      title={t("forecast.events")}
      subtitle={t("forecast.events.subtitle")}
      icon="calendar"
      action={<AddButton size="sm" onClick={() => setSheet("new")} label={t("common.add")} />}
    >
      {events.length > 0 && (
        <ul className={styles.list}>
          {byMonth(events).map((event) => (
            <li key={event.id}>
              <button type="button" onClick={() => setSheet(event)} className={styles.event}>
                <span className={styles.text}>
                  <span className={styles.note}>{event.note || t("forecast.events.unnamed")}</span>
                  <span className={styles.month}>{formatMonthCompact(event.month)}</span>
                </span>
                <span className={cx(styles.amount, event.amount < 0 ? styles.out : styles.in)}>
                  {formatMoney(convert(event.amount, event.currency, f.view, f.state.settings.rates), f.view, {
                    compact: true,
                    sign: true,
                  })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.footnote}>{t("forecast.events.note")}</p>
      {sheet && (
        <EventSheet
          key={sheet === "new" ? "new" : sheet.id}
          target={sheet}
          initial={sheet === "new" ? blankEventDraft(f.startMonth, f.base) : eventDraftOf(sheet)}
          currencies={displayCurrencies(f.state)}
          onSave={(draft) => save(sheet, draft)}
          onDelete={() => {
            if (sheet !== "new") remove(sheet);
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </Card>
  );
};

export default EventsCard;
