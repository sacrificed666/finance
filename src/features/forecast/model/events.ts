import { normalizePlannedEvents } from "@/features/data/model/normalize";
import type { PlannedEvent } from "@/features/data/model/types";
import { addMonths } from "@/shared/lib/date";
import type { Currency } from "@/shared/lib/money";

import { positiveAmount } from "./goal";

export interface EventDraft {
  month: string;
  amount: string;
  note: string;
  sign: "out" | "in";
  currency: Currency;
}

// A new one-off sum, half a year ahead and going out
export const blankEventDraft = (startMonth: string, currency: Currency): EventDraft => ({
  month: addMonths(startMonth, 6),
  amount: "",
  note: "",
  sign: "out",
  currency,
});

// The event a draft describes, or null while it has no amount
const eventOf = (draft: EventDraft, id: string): PlannedEvent | null => {
  const amount = positiveAmount(draft.amount);
  if (amount <= 0) return null;
  return {
    id,
    month: draft.month,
    amount: draft.sign === "out" ? -amount : amount,
    currency: draft.currency,
    note: draft.note.trim(),
  };
};

// The events with the draft added, or null while it has no amount
export const addPlannedEvent = (
  events: PlannedEvent[],
  draft: EventDraft,
  makeId: () => string,
): PlannedEvent[] | null => {
  const event = eventOf(draft, makeId());
  return event ? [...events, event] : null;
};

// The draft of a stored event, to change it
export const eventDraftOf = (event: PlannedEvent): EventDraft => ({
  month: event.month,
  amount: String(Math.abs(event.amount)),
  note: event.note,
  sign: event.amount < 0 ? "out" : "in",
  currency: event.currency,
});

// The events with the draft saved over its event, or added when new
export const savePlannedEvent = (
  events: PlannedEvent[],
  draft: EventDraft,
  target: PlannedEvent | "new",
  makeId: () => string,
): PlannedEvent[] | null => {
  if (target === "new") return addPlannedEvent(events, draft, makeId);
  const event = eventOf(draft, target.id);
  return event ? events.map((item) => (item.id === target.id ? event : item)) : null;
};

// The events in the order of their months
export const byMonth = (events: readonly PlannedEvent[]): PlannedEvent[] =>
  events.toSorted((a, b) => a.month.localeCompare(b.month));

// The planned events an older version kept in this browser, or none
export const parseLegacyEvents = (raw: string | null): PlannedEvent[] => {
  if (!raw) return [];
  try {
    return normalizePlannedEvents(JSON.parse(raw));
  } catch {
    return [];
  }
};

// The events with the older ones added, unless they are there already
export const mergeEvents = (events: PlannedEvent[], older: PlannedEvent[]): PlannedEvent[] => {
  const known = new Set(events.map((event) => event.id));
  return [...events, ...older.filter((event) => !known.has(event.id))];
};
