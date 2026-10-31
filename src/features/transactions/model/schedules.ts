import { stableJson } from "@/features/data/model/changes";
import type { AppState, Frequency, RecurringRule, Subscription, Transaction } from "@/features/data/model/types";
import {
  addDays,
  addMonths,
  currentMonth,
  dateInMonth,
  daysBetween,
  monthDiff,
  monthOf,
  todayISO,
} from "@/shared/lib/date";

// How far ahead recurring rules and subscriptions are booked
export const PLANNING_HORIZON_MONTHS = 12;

export type ScheduleKind = "recurring" | "subscription";

type Schedule = RecurringRule | Subscription;

// The id of the entry a schedule books for a slot: a month, or a day when weekly
const postingId = (kind: ScheduleKind, ownerId: string, slot: string): string =>
  `${kind === "recurring" ? "rec" : "sub"}:${ownerId}:${slot}`;

// Whether an entry was booked by a recurring rule or a subscription
export const isPostingOf = (entry: Transaction, kind: ScheduleKind, ownerId: string): boolean => {
  const link = kind === "recurring" ? entry.recurringId : entry.subscriptionId;
  return link === ownerId || entry.id.startsWith(postingId(kind, ownerId, ""));
};

// A slot as the end of an id: a month, or a day of a weekly schedule
const SLOT = /^\d{4}-\d{2}(?:-\d{2})?$/u;

// Tells whether a schedule of a kind books weekly, by its id
type WeeklyTest = (kind: ScheduleKind, ownerId: string) => boolean;

// The weekly schedules of a state, to read the slots of their entries
const weeklyIn =
  (state: AppState): WeeklyTest =>
  (kind, ownerId) =>
    scheduleOf(state, kind, ownerId)?.period === "weekly";

// The slot an entry was booked for, from its id or else its date
const postingSlot = (entry: Transaction, kind: ScheduleKind, ownerId: string, weekly: WeeklyTest): string => {
  const prefix = postingId(kind, ownerId, "");
  const tail = entry.id.startsWith(prefix) ? entry.id.slice(prefix.length) : "";
  if (SLOT.test(tail)) return tail;
  return weekly(kind, ownerId) ? entry.date : monthOf(entry.date);
};

// A schedule's entry id: its kind, the schedule and the slot
const POSTING_ID = /^(rec|sub):(.+):(\d{4}-\d{2}(?:-\d{2})?)$/u;

interface PostingKey {
  kind: ScheduleKind;
  ownerId: string;
  slot: string;
}

// Which schedule booked an entry and for which slot, or null for any other entry
const postingKeyOf = (entry: Transaction, weekly: WeeklyTest): PostingKey | null => {
  if (entry.recurringId) {
    const ownerId = entry.recurringId;
    return { kind: "recurring", ownerId, slot: postingSlot(entry, "recurring", ownerId, weekly) };
  }
  if (entry.subscriptionId) {
    const ownerId = entry.subscriptionId;
    return { kind: "subscription", ownerId, slot: postingSlot(entry, "subscription", ownerId, weekly) };
  }
  const match = POSTING_ID.exec(entry.id);
  if (!match?.[2] || !match[3]) return null;
  return { kind: match[1] === "rec" ? "recurring" : "subscription", ownerId: match[2], slot: match[3] };
};

// One schedule's slot as a key, to tell which slots already have an entry
const keyOf = (kind: ScheduleKind, ownerId: string, slot: string): string => `${kind}|${ownerId}|${slot}`;

// The slots of every schedule that hold an entry
const bookedSlots = (transactions: readonly Transaction[], weekly: WeeklyTest): Set<string> =>
  new Set(
    transactions.flatMap((entry) => {
      const key = postingKeyOf(entry, weekly);
      return key ? [keyOf(key.kind, key.ownerId, key.slot)] : [];
    }),
  );

// How often a schedule books, monthly unless it says otherwise
const frequencyOf = (schedule: Schedule): Frequency => schedule.period ?? "monthly";

// How many months apart a schedule's entries fall; weekly ones go by days
const MONTH_STEP: Record<Exclude<Frequency, "weekly">, number> = { monthly: 1, quarterly: 3, yearly: 12 };

// The first day a schedule books
const firstDay = (schedule: Schedule): string => dateInMonth(schedule.startMonth, schedule.dayOfMonth);

// The day a schedule books in a slot
const slotDay = (schedule: Schedule, slot: string): string =>
  slot.length > 7 ? slot : dateInMonth(slot, schedule.dayOfMonth);

// The slots a schedule books, from its start up to a month
const coveredSlots = (schedule: Schedule, through: string): string[] => {
  const to = schedule.endMonth && schedule.endMonth < through ? schedule.endMonth : through;
  const frequency = frequencyOf(schedule);
  const slots: string[] = [];
  if (frequency === "weekly") {
    for (let day = firstDay(schedule); monthOf(day) <= to; day = addDays(day, 7)) slots.push(day);
    return slots;
  }
  for (let month = schedule.startMonth; month <= to; month = addMonths(month, MONTH_STEP[frequency])) {
    slots.push(month);
  }
  return slots;
};

// Whether a slot's month lies between a schedule's start and its end
const withinSpan = (schedule: Schedule, slot: string): boolean => {
  const month = monthOf(slot);
  return month >= schedule.startMonth && (!schedule.endMonth || month <= schedule.endMonth);
};

// Whether a schedule books a slot: in its span, on its step, by the horizon
const booksSlot = (schedule: Schedule, slot: string, horizon: string): boolean => {
  if (!withinSpan(schedule, slot) || monthOf(slot) > horizon) return false;
  const frequency = frequencyOf(schedule);
  if (frequency === "weekly") {
    const days = daysBetween(firstDay(schedule), slot);
    return slot.length > 7 && days >= 0 && days % 7 === 0;
  }
  return slot.length === 7 && monthDiff(schedule.startMonth, slot) % MONTH_STEP[frequency] === 0;
};

// The last month the planning horizon reaches
const horizonMonth = (): string => addMonths(currentMonth(), PLANNING_HORIZON_MONTHS - 1);

// The entry a recurring rule books for a slot
const recurringPosting = (rule: RecurringRule, slot: string): Omit<Transaction, "id"> => ({
  type: rule.type,
  amount: rule.amount,
  currency: rule.currency,
  categoryId: rule.categoryId,
  date: slotDay(rule, slot),
  note: rule.note,
  accountId: rule.accountId,
  recurringId: rule.id,
});

// The expense a subscription books for a slot it charges in
const subscriptionPosting = (
  subscription: Subscription,
  slot: string,
  categoryId: string,
): Omit<Transaction, "id"> => ({
  type: "expense",
  amount: subscription.price,
  currency: subscription.currency,
  categoryId,
  date: slotDay(subscription, slot),
  note: subscription.name,
  accountId: subscription.accountId,
  subscriptionId: subscription.id,
});

// The category subscriptions are booked under, or the first expense category
const subscriptionCategoryId = (state: AppState): string | undefined =>
  state.categories.find((category) => category.id === "cat-subs")?.id ??
  state.categories.find((category) => category.kind === "expense")?.id;

// The entry a schedule books for a slot, or null when it cannot book one
const postingFor = (state: AppState, schedule: Schedule, slot: string): Omit<Transaction, "id"> | null => {
  if (!("price" in schedule)) return recurringPosting(schedule, slot);
  const categoryId = subscriptionCategoryId(state);
  return categoryId ? subscriptionPosting(schedule, slot, categoryId) : null;
};

// Whether an entry carries what a person added: tags, photos, a split or left out
const hasOwnContent = (entry: Transaction): boolean =>
  Boolean(entry.tags?.length) ||
  Boolean(entry.attachmentIds?.length) ||
  Boolean(entry.splitId) ||
  entry.excluded === true;

// What a person added to an entry, to keep when its schedule rewrites it
const ownContent = (entry: Transaction): Partial<Transaction> => ({
  ...(entry.tags ? { tags: entry.tags } : {}),
  ...(entry.attachmentIds ? { attachmentIds: entry.attachmentIds } : {}),
  ...(entry.excluded ? { excluded: true } : {}),
});

// Whether a schedule books entries at all: a paused subscription does not
const books = (schedule: Schedule): boolean => !("active" in schedule) || schedule.active;

// Books every schedule's slots up to the horizon without an entry or a skip
export const materializeRecurring = (state: AppState): AppState => {
  const horizon = horizonMonth();
  const booked = bookedSlots(state.transactions, weeklyIn(state));
  const added: Transaction[] = [];

  // Books the open slots of one schedule
  const book = (kind: ScheduleKind, schedule: Schedule) => {
    if (!books(schedule)) return;
    const skipped = new Set(schedule.skipped ?? []);
    for (const slot of coveredSlots(schedule, horizon)) {
      if (skipped.has(slot) || booked.has(keyOf(kind, schedule.id, slot))) continue;
      const posting = postingFor(state, schedule, slot);
      if (posting) added.push({ id: postingId(kind, schedule.id, slot), ...posting });
    }
  };

  for (const rule of state.recurring) book("recurring", rule);
  for (const subscription of state.subscriptions) book("subscription", subscription);
  return added.length === 0 ? state : { ...state, transactions: [...state.transactions, ...added] };
};

// A schedule leaving out some more slots, kept once each and in order
const withSkipped = <T extends Schedule>(schedule: T, slots: readonly string[]): T => {
  const skipped = [...new Set([...(schedule.skipped ?? []), ...slots])]
    .filter((slot) => withinSpan(schedule, slot))
    .toSorted();
  return { ...schedule, skipped: skipped.length > 0 ? skipped : undefined };
};

// Schedules with the slots a change removed kept out from then on
export const rememberSkipped = (before: AppState, after: AppState): AppState => {
  if (before.transactions === after.transactions) return after;
  const weeklyBefore = weeklyIn(before);
  const kept = bookedSlots(after.transactions, weeklyIn(after));
  const gone = new Map<string, string[]>();
  for (const entry of before.transactions) {
    const key = postingKeyOf(entry, weeklyBefore);
    if (!key || kept.has(keyOf(key.kind, key.ownerId, key.slot))) continue;
    const owner = `${key.kind}|${key.ownerId}`;
    gone.set(owner, [...(gone.get(owner) ?? []), key.slot]);
  }
  if (gone.size === 0) return after;

  // A schedule with its removed slots inside its span left out from now on
  const mark = <T extends Schedule>(kind: ScheduleKind, schedule: T): T => {
    const slots = (gone.get(`${kind}|${schedule.id}`) ?? []).filter((slot) => withinSpan(schedule, slot));
    return books(schedule) && slots.length > 0 ? withSkipped(schedule, slots) : schedule;
  };
  const recurring = after.recurring.map((rule) => mark("recurring", rule));
  const subscriptions = after.subscriptions.map((subscription) => mark("subscription", subscription));
  const changed =
    recurring.some((rule, index) => rule !== after.recurring[index]) ||
    subscriptions.some((subscription, index) => subscription !== after.subscriptions[index]);
  return changed ? { ...after, recurring, subscriptions } : after;
};

// Whether an entry is a slot ahead exactly as its schedule books it, never stored
export const isUntouchedPlan = (state: AppState, entry: Transaction, today: string): boolean => {
  if (entry.date <= today || entry.externalId) return false;
  const key = postingKeyOf(entry, weeklyIn(state));
  if (!key || entry.id !== postingId(key.kind, key.ownerId, key.slot)) return false;
  const schedule = scheduleOf(state, key.kind, key.ownerId);
  if (!schedule || !books(schedule) || schedule.skipped?.includes(key.slot)) return false;
  if (!booksSlot(schedule, key.slot, horizonMonth())) return false;
  const posting = postingFor(state, schedule, key.slot);
  return posting !== null && stableJson(entry) === stableJson({ id: entry.id, ...posting });
};

// Removes a schedule and every entry it booked; bank imports stay as entries
export const deleteSchedule = (state: AppState, kind: ScheduleKind, id: string): AppState => ({
  ...state,
  recurring: kind === "recurring" ? state.recurring.filter((rule) => rule.id !== id) : state.recurring,
  subscriptions:
    kind === "subscription"
      ? state.subscriptions.filter((subscription) => subscription.id !== id)
      : state.subscriptions,
  transactions: state.transactions.flatMap((entry) => {
    if (!isPostingOf(entry, kind, id)) return [entry];
    return entry.externalId ? [{ ...entry, recurringId: undefined, subscriptionId: undefined }] : [];
  }),
});

// The schedule of a kind with an id
const scheduleOf = (state: AppState, kind: ScheduleKind, id: string): Schedule | undefined =>
  kind === "recurring" ? state.recurring.find((item) => item.id === id) : state.subscriptions.find((s) => s.id === id);

// The state with one schedule replaced
const withSchedule = (state: AppState, kind: ScheduleKind, schedule: Schedule): AppState =>
  kind === "recurring"
    ? {
        ...state,
        recurring: state.recurring.map((item) => (item.id === schedule.id && !("price" in schedule) ? schedule : item)),
      }
    : {
        ...state,
        subscriptions: state.subscriptions.map((item) =>
          item.id === schedule.id && "price" in schedule ? schedule : item,
        ),
      };

// An edited schedule's entries from today on, and the slots it now covers
export const syncSchedule = (state: AppState, kind: ScheduleKind, id: string, previous?: Schedule): AppState => {
  const schedule = scheduleOf(state, kind, id);
  if (!schedule) return state;
  const today = todayISO();
  const horizon = horizonMonth();
  const weekly = weeklyIn(state);
  const covered = new Set(books(schedule) ? coveredSlots(schedule, horizon) : []);
  const posted = new Set<string>();

  // Recorded entries stay within the span; planned ones follow the schedule
  const transactions = state.transactions.flatMap((entry): Transaction[] => {
    if (!isPostingOf(entry, kind, id)) return [entry];
    const slot = postingSlot(entry, kind, id, weekly);
    if (entry.externalId) {
      posted.add(slot);
      return [entry];
    }
    const recorded = entry.date <= today;
    const keep = recorded ? withinSpan(schedule, slot) : covered.has(slot);
    if (!keep) return hasOwnContent(entry) ? [entry] : [];
    posted.add(slot);
    if (recorded) return [entry];
    const posting = postingFor(state, schedule, slot);
    return posting ? [{ id: entry.id, ...posting, ...ownContent(entry) }] : [entry];
  });

  const skipped = new Set(schedule.skipped ?? []);
  // A slot left out before, or a past one the schedule did not cover before
  const leftOut = (slot: string): boolean =>
    skipped.has(slot) ||
    (previous !== undefined && slotDay(schedule, slot) <= today && monthOf(slot) >= previous.startMonth);
  const open = [...covered].filter((slot) => !posted.has(slot));
  const added = open.flatMap((slot) => {
    if (leftOut(slot)) return [];
    const posting = postingFor(state, schedule, slot);
    return posting ? [{ id: postingId(kind, id, slot), ...posting }] : [];
  });

  const next = withSkipped(schedule, open.filter(leftOut));
  return withSchedule({ ...state, transactions: [...transactions, ...added] }, kind, next);
};

// Ends recurring rules before a month; a rule that has not started yet is removed
export const stopSchedules = (state: AppState, ids: string[], month: string): AppState => {
  const lastMonth = addMonths(month, -1);
  let next = state;
  for (const id of ids) {
    const rule = next.recurring.find((item) => item.id === id);
    if (!rule) continue;
    if (rule.startMonth > lastMonth) {
      next = deleteSchedule(next, "recurring", id);
      continue;
    }
    const ended = { ...rule, endMonth: lastMonth };
    next = syncSchedule(
      { ...next, recurring: next.recurring.map((item) => (item.id === id ? ended : item)) },
      "recurring",
      id,
      rule,
    );
  }
  return next;
};

// The series colour of subscriptions in charts
export const SUBSCRIPTION_SLOT = 8;
