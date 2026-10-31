import { debtPayoff } from "@/features/data/model/finmath";
import type { AppState, Debt } from "@/features/data/model/types";
import { convert } from "@/shared/lib/money";

export const DEBT_SORTS = ["balance", "rate", "payoff", "name"] as const;

export type DebtSort = (typeof DEBT_SORTS)[number];

// The debts' monthly payments, interest to come and last payment's month
export const debtSchedule = (state: AppState, month: string) => {
  const { settings } = state;
  const base = settings.baseCurrency;
  let payment = 0;
  let interest = 0;
  let lastMonth = "";
  for (const debt of state.debts) {
    payment += convert(debt.monthlyPayment ?? 0, debt.currency, base, settings.rates);
    const payoff = debtPayoff(debt, month);
    if (!payoff || payoff.neverPaysOff) continue;
    interest += convert(payoff.interest, debt.currency, base, settings.rates);
    if (payoff.finalMonth > lastMonth) lastMonth = payoff.finalMonth;
  }
  return { payment, interest, lastMonth };
};

// A debt's key in an order; the endless go last, those without a plan before
export const debtSortKey = (state: AppState, debt: Debt, sort: DebtSort, month: string) => {
  if (sort === "name") return debt.name.toLocaleLowerCase();
  if (sort === "rate") return debt.annualRatePct ?? 0;
  if (sort === "payoff") {
    const payoff = debtPayoff(debt, month);
    if (!payoff) return Number.MAX_SAFE_INTEGER - 1;
    return payoff.neverPaysOff ? Number.MAX_SAFE_INTEGER : payoff.months;
  }
  return convert(debt.balance, debt.currency, state.settings.baseCurrency, state.settings.rates);
};

// The debts in the base currency, as the payoff planner takes them
export const payoffDebts = (state: AppState) => {
  const { settings } = state;
  return state.debts.map((debt) => ({
    id: debt.id,
    balance: convert(debt.balance, debt.currency, settings.baseCurrency, settings.rates),
    ratePct: debt.annualRatePct ?? 0,
    payment: convert(debt.monthlyPayment ?? 0, debt.currency, settings.baseCurrency, settings.rates),
  }));
};
