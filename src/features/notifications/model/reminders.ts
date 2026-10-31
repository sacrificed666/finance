import { gracesDue } from "@/features/accounts/model/grace";
import { categoryName } from "@/features/data/model/categoryName";
import type { AppState, Transaction } from "@/features/data/model/types";
import { isPlaceholder } from "@/features/import/model/import";
import { hasTaxCalendar, upcomingObligations, type TaxObligation } from "@/features/income/model/taxCalendar";
import { setFormatLocale } from "@/shared/i18n/format";
import type { I18n } from "@/shared/i18n/translate";
import { addDays, formatMonth } from "@/shared/lib/date";
import type { Currency } from "@/shared/lib/money";
import { formatMoney } from "@/shared/lib/money";

export type ReminderKind = "payment" | "income" | "tax" | "receivable" | "grace";

export interface Reminder {
  kind: ReminderKind;
  date: string;
  subject: string;
  amount?: number;
  currency: Currency;
}

export interface PushMessage {
  title: string;
  body: string;
  url: string;
  tag: string;
}

// The reminders a digest lists before it counts the rest
const SHOWN = 5;
const TAX_NOTICE_DAYS = 3;

// What an entry is about: its subscription, note or category
const subjectOf = (state: AppState, tx: Transaction, i18n: I18n): string => {
  const sub = tx.subscriptionId ? state.subscriptions.find((s) => s.id === tx.subscriptionId) : undefined;
  if (sub) return sub.name;
  if (tx.note) return tx.note;
  return categoryName(
    i18n,
    state.categories.find((c) => c.id === tx.categoryId),
  );
};

// A tax deadline's name with its quarter, month or period
const taxSubject = (o: TaxObligation, i18n: I18n): string => {
  const quarter = /^(\d{4})-Q(\d)$/.exec(o.period);
  const period = quarter
    ? i18n.t("taxcal.quarter", { q: quarter[2] ?? "", year: quarter[1] ?? "" })
    : /^\d{4}-\d{2}$/.test(o.period)
      ? formatMonth(o.period)
      : o.period;
  return i18n.tk(`taxcal.${o.kind}`, o.kind, { period });
};

// Today's and tomorrow's payments, near tax deadlines and loans due back
export const dueReminders = (state: AppState, today: string, i18n: I18n): Reminder[] => {
  setFormatLocale(i18n.intl);
  const tomorrow = addDays(today, 1);
  const out: Reminder[] = [];

  for (const tx of state.transactions) {
    if (tx.type === "transfer" || tx.externalId || !isPlaceholder(tx) || tx.id.startsWith("tax:")) continue;
    if (tx.date !== today && tx.date !== tomorrow) continue;
    out.push({
      kind: tx.type === "income" ? "income" : "payment",
      date: tx.date,
      subject: subjectOf(state, tx, i18n),
      amount: tx.amount,
      currency: tx.currency,
    });
  }

  if (hasTaxCalendar(state.settings.tax.regime)) {
    for (const o of upcomingObligations(state, today, 20)) {
      if (o.due !== today && o.due !== addDays(today, TAX_NOTICE_DAYS)) continue;
      out.push({
        kind: "tax",
        date: o.due,
        subject: taxSubject(o, i18n),
        amount: o.amount === 0 ? undefined : o.amount,
        currency: "UAH",
      });
    }
  }

  for (const due of gracesDue(state, today)) {
    if (due.due !== today && due.due !== addDays(today, TAX_NOTICE_DAYS)) continue;
    out.push({
      kind: "grace",
      date: due.due,
      subject: i18n.t("push.grace", { name: due.account.name }),
      amount: due.amount,
      currency: due.account.currency,
    });
  }

  for (const r of state.receivables) {
    if (r.dueDate !== today || r.repaid >= r.amount) continue;
    out.push({
      kind: "receivable",
      date: today,
      subject: i18n.t("push.receivable", { name: r.name }),
      amount: r.amount - r.repaid,
      currency: r.currency,
    });
  }

  const order: Record<ReminderKind, number> = { tax: 0, grace: 1, payment: 2, receivable: 3, income: 4 };
  return out.toSorted(
    (a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind] || (b.amount ?? 0) - (a.amount ?? 0),
  );
};

// The daily digest of reminders, the first five and a count of the rest
export const reminderMessage = (reminders: Reminder[], today: string, i18n: I18n): PushMessage | null => {
  if (reminders.length === 0) return null;
  setFormatLocale(i18n.intl);
  const tomorrow = addDays(today, 1);
  // When a reminder is: today, tomorrow or in some days
  const when = (date: string) => {
    if (date === today) return i18n.t("push.today");
    if (date === tomorrow) return i18n.t("push.tomorrow");
    return i18n.tp("push.inDays", Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000));
  };
  // A reminder as one line: when, what and how much
  const line = (r: Reminder) => {
    const amount = r.amount
      ? formatMoney(r.amount, r.currency, { sign: r.kind === "income" || r.kind === "receivable" })
      : "";
    return [when(r.date), r.subject, amount].filter(Boolean).join(" · ");
  };
  const lines = reminders.slice(0, SHOWN).map(line);
  if (reminders.length > SHOWN) lines.push(i18n.tp("push.more", reminders.length - SHOWN));
  return {
    title: i18n.t("push.title"),
    body: lines.join("\n"),
    url: reminders.some((r) => r.kind === "tax") ? "/income" : "/calendar",
    tag: `digest-${today}`,
  };
};
