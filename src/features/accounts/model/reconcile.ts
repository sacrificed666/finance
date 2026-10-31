import type { AppState, SavingsAccount, Transaction } from "@/features/data/model/types";
import { parseAmount } from "@/shared/lib/money";

// Where an adjustment goes: other income when it adds, other costs when it takes
export const adjustmentCategoryId = (state: AppState, up: boolean): string | undefined => {
  const kind = up ? "income" : "expense";
  const other = up ? "cat-other-inc" : "cat-other-exp";
  return (state.categories.find((entry) => entry.id === other) ?? state.categories.find((entry) => entry.kind === kind))
    ?.id;
};

export type ReconcileProblem =
  | "balance.move.problem.enter"
  | "balance.move.problem.matches"
  | "balance.move.problem.categories";

// What stops the balance from being matched to the bank's, or null
export const reconcileProblem = (state: AppState, typed: string, current: number): ReconcileProblem | null => {
  const amount = parseAmount(typed);
  if (typed.trim() === "" || !Number.isFinite(amount)) return "balance.move.problem.enter";
  const delta = amount - current;
  if (Math.abs(delta) < 0.005) return "balance.move.problem.matches";
  if (!adjustmentCategoryId(state, delta > 0)) return "balance.move.problem.categories";
  return null;
};

// The entry that brings an account's balance to the bank's, dated today
export const adjustmentEntry = (
  state: AppState,
  account: SavingsAccount,
  delta: number,
  today: string,
  note: string,
  id: string,
): Transaction | null => {
  const categoryId = adjustmentCategoryId(state, delta > 0);
  if (!categoryId) return null;
  return {
    id,
    type: delta > 0 ? "income" : "expense",
    amount: Math.abs(delta),
    currency: account.currency,
    categoryId,
    date: today,
    note,
    accountId: account.id,
  };
};
