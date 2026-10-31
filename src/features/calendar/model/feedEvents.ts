import { gracesDue } from "@/features/accounts/model/grace";
import { categoryName } from "@/features/data/model/categoryName";
import type { AppState, Transaction } from "@/features/data/model/types";
import { upcomingObligations, type TaxObligation } from "@/features/income/model/taxCalendar";
import { setFormatLocale } from "@/shared/i18n/format";
import type { I18n } from "@/shared/i18n/translate";
import { addMonths, formatMonth, monthOf } from "@/shared/lib/date";
import type { IcsEvent } from "@/shared/lib/ics";
import { formatMoney } from "@/shared/lib/money";

// How many months ahead the calendar reaches
const AHEAD_MONTHS = 6;

// What a planned entry is about: its subscription, note or category
const entryName = (state: AppState, tx: Transaction, i18n: I18n): string => {
  const subscription = tx.subscriptionId
    ? state.subscriptions.find((item) => item.id === tx.subscriptionId)
    : undefined;
  if (subscription) return subscription.name;
  if (tx.note?.trim()) return tx.note.trim();
  return categoryName(
    i18n,
    state.categories.find((category) => category.id === tx.categoryId),
  );
};

// A tax deadline's name with its quarter, month or year
const taxName = (obligation: TaxObligation, i18n: I18n): string => {
  const quarter = /^(\d{4})-Q(\d)$/u.exec(obligation.period);
  let period = obligation.period;
  if (quarter) period = i18n.t("taxcal.quarter", { q: quarter[2] ?? "", year: quarter[1] ?? "" });
  else if (/^\d{4}-\d{2}$/u.test(obligation.period)) period = formatMonth(obligation.period);
  return i18n.tk(`taxcal.${obligation.kind}`, obligation.kind, { period });
};

// A sum with the sign of the way it moves
const signed = (amount: number, currency: Transaction["currency"], incoming: boolean) =>
  formatMoney(incoming ? amount : -amount, currency, { sign: true });

// The calendar's dates: planned money, taxes, money due back and grace periods
export const feedEvents = (state: AppState, today: string, i18n: I18n): IcsEvent[] => {
  setFormatLocale(i18n.intl);
  const until = `${addMonths(monthOf(today), AHEAD_MONTHS)}-31`;

  const planned = state.transactions
    .filter((tx) => tx.type !== "transfer" && tx.date >= today && tx.date <= until && !tx.externalId)
    .map((tx): IcsEvent => ({
      uid: `entry-${tx.id}@finance`,
      date: tx.date,
      title: `${entryName(state, tx, i18n)} ${signed(tx.amount, tx.currency, tx.type === "income")}`,
    }));
  const taxes = upcomingObligations(state, today, 24)
    .filter((obligation) => obligation.due <= until)
    .map((obligation): IcsEvent => ({
      uid: `tax-${obligation.id}@finance`,
      date: obligation.due,
      title: [taxName(obligation, i18n), obligation.amount ? formatMoney(obligation.amount, "UAH") : null]
        .filter(Boolean)
        .join(" "),
    }));
  const owed = state.receivables
    .filter((item) => item.dueDate && item.dueDate >= today && item.dueDate <= until && item.repaid < item.amount)
    .map((item): IcsEvent => ({
      uid: `owed-${item.id}@finance`,
      date: item.dueDate ?? today,
      title: `${i18n.t("push.receivable", { name: item.name })} ${formatMoney(item.amount - item.repaid, item.currency)}`,
    }));
  const graces = gracesDue(state, today).map((due): IcsEvent => ({
    uid: `grace-${due.account.id}-${monthOf(due.due)}@finance`,
    date: due.due,
    title: `${i18n.t("push.grace", { name: due.account.name })} ${formatMoney(due.amount, due.account.currency)}`,
  }));
  const maturities = state.investments
    .filter((investment) => investment.endDate && investment.endDate >= today && investment.endDate <= until)
    .map((investment): IcsEvent => ({
      uid: `matures-${investment.id}@finance`,
      date: investment.endDate ?? today,
      title: `${investment.name}: ${i18n.t("balance.inv.matures")}`,
    }));
  return [...planned, ...taxes, ...owed, ...graces, ...maturities].toSorted((a, b) => a.date.localeCompare(b.date));
};
