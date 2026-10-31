import { accountBalances } from "@/features/data/model/finmath";
import type { AppState, SavingsAccount } from "@/features/data/model/types";
import { addDays, dateInMonth, monthOf } from "@/shared/lib/date";
import { convert } from "@/shared/lib/money";

export interface GraceDue {
  account: SavingsAccount;
  amount: number;
  due: string;
}

// What came into an account in a month up to a day: income and transfers in
const cameIn = (state: AppState, account: SavingsAccount, month: string, today: string): number =>
  state.transactions.reduce((sum, tx) => {
    if (monthOf(tx.date) !== month || tx.date > today) return sum;
    if (tx.type === "income" && tx.accountId === account.id) {
      return sum + convert(tx.amount, tx.currency, account.currency, state.settings.rates);
    }
    if (tx.type === "transfer" && tx.toAccountId === account.id) return sum + (tx.toAmount ?? tx.amount);
    return sum;
  }, 0);

// Last month's credit card debt to repay by this month's end, interest free
export const graceDue = (state: AppState, account: SavingsAccount, today: string): GraceDue | null => {
  if (!account.credit) return null;
  const month = monthOf(today);
  const lastDay = addDays(`${month}-01`, -1);
  const owed = -(accountBalances(state, lastDay).get(account.id) ?? 0);
  if (owed <= 0.5) return null;
  const amount = Math.max(0, owed - cameIn(state, account, month, today));
  return amount > 0.5 ? { account, amount, due: dateInMonth(month, 31) } : null;
};

// Every credit card with money to bring back this month
export const gracesDue = (state: AppState, today: string): GraceDue[] =>
  state.savings.flatMap((account) => {
    const due = graceDue(state, account, today);
    return due ? [due] : [];
  });
