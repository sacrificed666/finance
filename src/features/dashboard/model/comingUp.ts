import { gracesDue, type GraceDue } from "@/features/accounts/model/grace";
import type { AppState, Investment, Receivable, Transaction } from "@/features/data/model/types";
import { expectedIncomes, type RegularIncome } from "@/features/income/model/income";
import { upcomingObligations, type TaxObligation } from "@/features/income/model/taxCalendar";
import { addDays } from "@/shared/lib/date";
import type { Currency } from "@/shared/lib/money";

export type ComingKind = "tax" | "receivable" | "income" | "expense" | "maturity" | "grace";

export interface ComingItem {
  id: string;
  date: string;
  kind: ComingKind;
  icon: string;
  slot?: number;
  amount?: number;
  currency?: Currency;
  overdue: boolean;
  obligation?: TaxObligation;
  receivable?: Receivable;
  tx?: Transaction;
  investment?: Investment;
  expected?: RegularIncome;
  grace?: GraceDue;
}

// How far ahead the overview looks, and how many dates it lists
export const COMING_DAYS = 14;
export const COMING_SHOWN = 6;

// What falls due from today for two weeks, overdue first, then by date
export const comingUp = (state: AppState, today: string, days = COMING_DAYS): ComingItem[] => {
  const until = addDays(today, days);
  const categories = new Map(state.categories.map((category) => [category.id, category]));
  const subscriptions = new Map(state.subscriptions.map((sub) => [sub.id, sub.icon]));
  const taxes = upcomingObligations(state, today, 12)
    .filter((obligation) => obligation.due <= until)
    .map((obligation): ComingItem => ({
      id: `tax:${obligation.id}`,
      date: obligation.due,
      kind: "tax",
      icon: "🧾",
      amount: obligation.amount,
      currency: "UAH",
      overdue: obligation.due < today,
      obligation,
    }));
  const loans = state.receivables.flatMap((receivable): ComingItem[] =>
    receivable.dueDate && receivable.dueDate <= until && receivable.repaid < receivable.amount
      ? [
          {
            id: `rec:${receivable.id}`,
            date: receivable.dueDate,
            kind: "receivable",
            icon: receivable.icon,
            amount: receivable.amount - receivable.repaid,
            currency: receivable.currency,
            overdue: receivable.dueDate < today,
            receivable,
          },
        ]
      : [],
  );
  const planned = state.transactions
    .filter((tx) => tx.type !== "transfer" && tx.date > today && tx.date <= until)
    .map((tx): ComingItem => ({
      id: `tx:${tx.id}`,
      date: tx.date,
      kind: tx.type === "income" ? "income" : "expense",
      icon: subscriptions.get(tx.subscriptionId ?? "") ?? categories.get(tx.categoryId)?.icon ?? "💸",
      slot: categories.get(tx.categoryId)?.colorSlot,
      amount: tx.amount,
      currency: tx.currency,
      overdue: false,
      tx,
    }));
  const maturities = state.investments.flatMap((investment): ComingItem[] =>
    investment.endDate && investment.endDate >= today && investment.endDate <= until
      ? [
          {
            id: `inv:${investment.id}`,
            date: investment.endDate,
            kind: "maturity",
            icon: "📜",
            overdue: false,
            investment,
          },
        ]
      : [],
  );
  // Regular incomes due again, unless a planned income already stands for them
  const expected = expectedIncomes(state, today, until).map((income): ComingItem => {
    const category = categories.get(income.categoryId);
    return {
      id: `exp:${income.name || income.categoryId}`,
      date: income.next,
      kind: "income",
      icon: category?.icon ?? "💰",
      slot: category?.colorSlot,
      amount: income.amount,
      currency: income.currency,
      overdue: false,
      expected: income,
    };
  });
  // Credit cards to bring back before their grace period ends
  const graces = gracesDue(state, today)
    .filter((due) => due.due <= until)
    .map((due): ComingItem => ({
      id: `grace:${due.account.id}`,
      date: due.due,
      kind: "grace",
      icon: due.account.icon,
      amount: due.amount,
      currency: due.account.currency,
      overdue: false,
      grace: due,
    }));
  return [...taxes, ...loans, ...planned, ...maturities, ...expected, ...graces].toSorted(
    (a, b) => Number(b.overdue) - Number(a.overdue) || a.date.localeCompare(b.date),
  );
};
