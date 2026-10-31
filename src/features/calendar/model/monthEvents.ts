import { gracesDue } from "@/features/accounts/model/grace";
import type { AppState, Category, Transaction } from "@/features/data/model/types";
import { taxObligations, type TaxObligation } from "@/features/income/model/taxCalendar";
import { dateInMonth, daysInMonth, monthOf, todayISO } from "@/shared/lib/date";
import { convert, ratesAt, type Currency } from "@/shared/lib/money";

export type EventKind = "expense" | "income" | "transfer" | "tax" | "maturity" | "receivable" | "grace" | "wish";

export interface DayEvent {
  id: string;
  date: string;
  kind: EventKind;
  title: string;
  subtitle?: string;
  icon: string;
  amount?: number;
  currency?: Currency;
  tx?: Transaction;
}

export interface DaySummary {
  date: string;
  events: DayEvent[];
  net: number;
  spent: number;
}

// The colour that marks each kind of event
export const KIND_COLOR: Record<EventKind, string> = {
  expense: "var(--color-expense)",
  income: "var(--color-income)",
  transfer: "var(--color-text-tertiary)",
  tax: "var(--color-warning)",
  maturity: "var(--series-6)",
  receivable: "var(--series-4)",
  grace: "var(--series-11)",
  wish: "var(--series-9)",
};

// The kinds the legend under the month explains
export const LEGEND_KINDS = ["expense", "income", "tax", "maturity", "receivable", "grace", "wish"] as const;

export interface EventNames {
  category: (entry: Category | undefined) => string;
  obligation: (obligation: TaxObligation) => string;
  paid: string;
  matures: string;
  receivables: string;
  grace: string;
  wishes: string;
}

// The month's entries as events: transfers between accounts, the rest by category
export const entryEvents = (state: AppState, month: string, names: EventNames): DayEvent[] => {
  const categories = new Map(state.categories.map((entry) => [entry.id, entry]));
  const accounts = new Map(state.savings.map((account) => [account.id, account.name]));
  const subscriptions = new Map(state.subscriptions.map((sub) => [sub.id, sub]));
  return state.transactions
    .filter((tx) => monthOf(tx.date) === month)
    .map((tx): DayEvent => {
      if (tx.type === "transfer") {
        const from = accounts.get(tx.accountId ?? "") ?? "?";
        const to = accounts.get(tx.toAccountId ?? "") ?? "?";
        const title = `${from} → ${to}`;
        return {
          id: tx.id,
          date: tx.date,
          kind: "transfer",
          icon: "⇄",
          title,
          amount: tx.amount,
          currency: tx.currency,
          tx,
        };
      }
      const entry = categories.get(tx.categoryId);
      const sub = tx.subscriptionId ? subscriptions.get(tx.subscriptionId) : undefined;
      const note = tx.note?.trim() ? tx.note : undefined;
      return {
        id: tx.id,
        date: tx.date,
        kind: tx.type,
        icon: sub?.icon ?? entry?.icon ?? "❓",
        title: sub?.name ?? note ?? names.category(entry),
        subtitle: sub || note ? names.category(entry) : undefined,
        amount: tx.amount,
        currency: tx.currency,
        tx,
      };
    });
};

// The month's tax deadlines, maturities, loans due back, grace periods and wishes
export const keyDates = (state: AppState, month: string, names: EventNames, today = todayISO()): DayEvent[] => {
  const paid = state.settings.taxPaid ?? {};
  const taxes = monthObligations(state, month).map((obligation): DayEvent => ({
    id: `tax:${obligation.id}`,
    date: obligation.due,
    kind: "tax",
    icon: "🧾",
    title: names.obligation(obligation),
    subtitle: paid[obligation.id] ? names.paid : undefined,
    amount: obligation.amount,
    currency: "UAH",
  }));
  const maturities = state.investments.flatMap((inv): DayEvent[] =>
    inv.endDate && monthOf(inv.endDate) === month
      ? [
          {
            id: `inv:${inv.id}`,
            date: inv.endDate,
            kind: "maturity",
            icon: "📜",
            title: inv.name,
            subtitle: names.matures,
          },
        ]
      : [],
  );
  const loans = state.receivables.flatMap((loan): DayEvent[] =>
    loan.dueDate && monthOf(loan.dueDate) === month && loan.repaid < loan.amount
      ? [
          {
            id: `rec:${loan.id}`,
            date: loan.dueDate,
            kind: "receivable",
            icon: loan.icon,
            title: loan.name,
            subtitle: names.receivables,
            amount: loan.amount - loan.repaid,
            currency: loan.currency,
          },
        ]
      : [],
  );
  const wishes = state.wishlist.flatMap((wish): DayEvent[] =>
    wish.month === month
      ? [
          {
            id: `wish:${wish.id}`,
            date: dateInMonth(month, 1),
            kind: "wish",
            icon: wish.icon,
            title: wish.name,
            subtitle: names.wishes,
            amount: wish.price,
            currency: wish.currency,
          },
        ]
      : [],
  );
  // A credit card's grace period ends with the running month only
  const graces = (monthOf(today) === month ? gracesDue(state, today) : []).map((due): DayEvent => ({
    id: `grace:${due.account.id}`,
    date: due.due,
    kind: "grace",
    icon: due.account.icon,
    title: due.account.name,
    subtitle: names.grace,
    amount: due.amount,
    currency: due.account.currency,
  }));
  return [...taxes, ...maturities, ...loans, ...graces, ...wishes].toSorted((a, b) => a.date.localeCompare(b.date));
};

// The tax deadlines that fall in the month, of its year and the year before
export const monthObligations = (state: AppState, month: string): TaxObligation[] => {
  const year = Number(month.slice(0, 4));
  return [...taxObligations(state, year - 1), ...taxObligations(state, year)].filter(
    (obligation) => monthOf(obligation.due) === month,
  );
};

// Every day of the month with its events, what it nets and what it spends
export const daySummaries = (state: AppState, month: string, events: readonly DayEvent[]): DaySummary[] => {
  const base = state.settings.baseCurrency;
  return Array.from({ length: daysInMonth(month) }, (_, index) => {
    const date = dateInMonth(month, index + 1);
    const own = events.filter((event) => event.date === date);
    // An event's amount in the base currency at the day's rates
    const inBase = (event: DayEvent) =>
      convert(event.amount ?? 0, event.currency ?? base, base, ratesAt(state.settings, date));
    // The day's events of a kind summed in the base currency
    const sum = (kind: EventKind) =>
      own
        .filter((event) => event.kind === kind && event.tx?.excluded !== true)
        .reduce((total, event) => total + inBase(event), 0);
    const spent = sum("expense");
    return { date, events: own, net: sum("income") - spent, spent };
  });
};

// What a day brought in
export const earnedOn = (day: DaySummary): number => Math.max(0, day.net + day.spent);

export interface MonthFigures {
  net: number;
  entries: number;
  spent: number;
  earned: number;
  aheadOut: number;
  aheadIn: number;
  daysOut: number;
  daysIn: number;
  busiest: DaySummary | undefined;
  daysGone: number;
  daysWithoutSpend: number;
}

// The month's net, entries, money still to move, busiest day and no-spend days
export const monthFigures = (days: readonly DaySummary[], today: string): MonthFigures => {
  const ahead = days.filter((day) => day.date > today);
  const gone = days.filter((day) => day.date <= today);
  const busiest = days.reduce<DaySummary | null>((best, day) => (best && best.spent >= day.spent ? best : day), null);
  return {
    net: days.reduce((sum, day) => sum + day.net, 0),
    entries: days.reduce((sum, day) => sum + day.events.filter((event) => event.tx).length, 0),
    spent: days.reduce((sum, day) => sum + day.spent, 0),
    earned: days.reduce((sum, day) => sum + earnedOn(day), 0),
    aheadOut: ahead.reduce((sum, day) => sum + day.spent, 0),
    aheadIn: ahead.reduce((sum, day) => sum + earnedOn(day), 0),
    daysOut: ahead.filter((day) => day.spent > 0).length,
    daysIn: ahead.filter((day) => earnedOn(day) > 0).length,
    busiest: busiest && busiest.spent > 0 ? busiest : undefined,
    daysGone: gone.length,
    daysWithoutSpend: gone.filter((day) => day.spent === 0).length,
  };
};

// The month's net as it builds up, from zero before the first day to the last
export const runningNet = (days: readonly DaySummary[]): number[] => {
  const totals = [0];
  for (const day of days) totals.push((totals.at(-1) ?? 0) + day.net);
  return totals;
};

export interface WeekSummary {
  from: string;
  to: string;
  spent: number;
  earned: number;
  entries: number;
}

// The month's days in weeks from Monday, cut at the month's edges
export const monthWeeks = (days: readonly DaySummary[]): WeekSummary[] => {
  const weeks: WeekSummary[] = [];
  for (const day of days) {
    const entries = day.events.filter((event) => event.tx).length;
    const week = weeks.at(-1);
    if (!week || new Date(`${day.date}T12:00:00Z`).getUTCDay() === 1) {
      weeks.push({ from: day.date, to: day.date, spent: day.spent, earned: earnedOn(day), entries });
    } else {
      week.to = day.date;
      week.spent += day.spent;
      week.earned += earnedOn(day);
      week.entries += entries;
    }
  }
  return weeks;
};
