import { activeAccounts } from "@/features/accounts/model/accounts";
import type { AppState } from "@/features/data/model/types";
import { categoryTree } from "@/features/transactions/model/categories";
import type { Currency } from "@/shared/lib/money";

export type QuickType = "income" | "expense";

export interface QuickEntry {
  type: QuickType;
  amount: number;
  currency: Currency;
  categoryId: string;
  accountId: string;
  note: string;
  date: string;
}

// The category picked when it fits the type, or the type's first one
export const quickCategory = (state: AppState, type: QuickType, choice: string | null): string => {
  const fits = state.categories.some((entry) => entry.kind === type && entry.id === choice);
  if (choice && fits) return choice;
  return categoryTree(state.categories, type)[0]?.parent.id ?? "";
};

// The account picked, none when that was chosen, or the first one in use
export const quickAccount = (state: AppState, choice: string | null): string => {
  if (choice === "" || state.savings.some((account) => account.id === choice)) return choice ?? "";
  return activeAccounts(state.savings)[0]?.id ?? "";
};

// The state with a quick entry added
export const addQuickEntry = (state: AppState, entry: QuickEntry, makeId: () => string): AppState => ({
  ...state,
  transactions: [
    ...state.transactions,
    {
      id: makeId(),
      type: entry.type,
      amount: entry.amount,
      currency: entry.currency,
      categoryId: entry.categoryId,
      date: entry.date,
      note: entry.note.trim() || undefined,
      accountId: entry.accountId || undefined,
    },
  ],
});
