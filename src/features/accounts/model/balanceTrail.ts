import { accountBalance, netWorth } from "@/features/data/model/finmath";
import type { AppState, SavingsAccount } from "@/features/data/model/types";
import { addDays, addMonths, monthOf } from "@/shared/lib/date";

// The last day of each of the months before today's, then today
const trailDates = (today: string, months: number) => {
  const current = monthOf(today);
  const ends = Array.from({ length: months }, (_, index) =>
    addDays(`${addMonths(current, index - months + 1)}-01`, -1),
  );
  return [...ends, today];
};

// An account's balance at the end of each of the last months, then today
export const balanceTrail = (account: SavingsAccount, state: AppState, today: string, months = 6): number[] =>
  trailDates(today, months).map((date) => accountBalance(account, state.transactions, state.settings, date));

// The money in every account, in the base currency, at the same points
export const savingsTrail = (state: AppState, today: string, months = 6): number[] =>
  trailDates(today, months).map((date) => netWorth(state, date).savings);
