import type { AppState, SavingsAccount, Transaction } from "@/features/data/model/types";

// The accounts in use, with any archived one an entry already points at
export const pickableAccounts = (
  accounts: readonly SavingsAccount[],
  chosen: ReadonlyArray<string | undefined> = [],
): SavingsAccount[] => accounts.filter((account) => !account.archived || chosen.includes(account.id));

// The accounts not put away in the archive
export const activeAccounts = (accounts: readonly SavingsAccount[]): SavingsAccount[] => pickableAccounts(accounts);

// The account put away in the archive, or taken back out of it
export const archiveAccount = (state: AppState, id: string, archived: boolean): AppState => ({
  ...state,
  savings: state.savings.map((account) => {
    if (account.id !== id) return account;
    const { archived: _was, ...rest } = account;
    return archived ? { ...rest, archived: true } : rest;
  }),
});

export interface AccountUsage {
  entries: number;
  transfers: number;
  recurring: number;
  subscriptions: number;
}

// The notes of transfers that lose a side to a deleted account, translated
export interface DeletedAccountLabels {
  from: (name: string) => string;
  to: (name: string) => string;
  unnamed: string;
}

// How many records point at an account, to warn before it is deleted
export const accountUsage = (state: AppState, id: string): AccountUsage => {
  const usage: AccountUsage = { entries: 0, transfers: 0, recurring: 0, subscriptions: 0 };
  for (const entry of state.transactions) {
    if (entry.type === "transfer") {
      if (entry.accountId === id || entry.toAccountId === id) usage.transfers += 1;
    } else if (entry.accountId === id) {
      usage.entries += 1;
    }
  }
  usage.recurring = state.recurring.filter((rule) => rule.accountId === id).length;
  usage.subscriptions = state.subscriptions.filter((subscription) => subscription.accountId === id).length;
  return usage;
};

// Deletes an account; a transfer left with one side turns into income or a cost
export const deleteAccount = (state: AppState, id: string, labels: DeletedAccountLabels): AppState => {
  const outCategory =
    state.categories.find((category) => category.id === "cat-other-exp")?.id ??
    state.categories.find((category) => category.kind === "expense")?.id;
  const inCategory =
    state.categories.find((category) => category.id === "cat-other-inc")?.id ??
    state.categories.find((category) => category.kind === "income")?.id;
  const name = state.savings.find((account) => account.id === id)?.name ?? labels.unnamed;
  const currencyOf = new Map(state.savings.map((account) => [account.id, account.currency]));

  // Every entry with the account cut out of it
  const transactions = state.transactions.flatMap((entry): Transaction[] => {
    if (entry.type !== "transfer") return entry.accountId === id ? [{ ...entry, accountId: undefined }] : [entry];
    const fromGone = entry.accountId === id;
    const toGone = entry.toAccountId === id;
    if (!fromGone && !toGone) return [entry];
    // Money that came from the deleted account is now income of the other one
    if (fromGone && !toGone) {
      const destination = entry.toAccountId ? currencyOf.get(entry.toAccountId) : undefined;
      if (!inCategory || !destination) return [];
      return [
        {
          id: entry.id,
          type: "income",
          amount: entry.toAmount ?? entry.amount,
          currency: destination,
          categoryId: inCategory,
          date: entry.date,
          note: entry.note ?? labels.from(name),
          accountId: entry.toAccountId,
        },
      ];
    }
    // Money that went to the deleted account is now an expense of the other one
    if (toGone && !fromGone) {
      if (!outCategory) return [];
      return [
        {
          id: entry.id,
          type: "expense",
          amount: entry.amount,
          currency: entry.currency,
          categoryId: outCategory,
          date: entry.date,
          note: entry.note ?? labels.to(name),
          accountId: entry.accountId,
        },
      ];
    }
    return [];
  });

  // The bank cards still linked to accounts that stay
  const bankLinks = Object.fromEntries(Object.entries(state.settings.bankLinks ?? {}).filter(([, to]) => to !== id));

  return {
    ...state,
    savings: state.savings.filter((account) => account.id !== id),
    transactions,
    recurring: state.recurring.map((rule) => (rule.accountId === id ? { ...rule, accountId: undefined } : rule)),
    subscriptions: state.subscriptions.map((subscription) =>
      subscription.accountId === id ? { ...subscription, accountId: undefined } : subscription,
    ),
    goals: state.goals.map((goal) => {
      if (!goal.accountIds?.includes(id)) return goal;
      const { accountIds, ...rest } = goal;
      const kept = accountIds.filter((accountId) => accountId !== id);
      return kept.length > 0 ? { ...rest, accountIds: kept } : rest;
    }),
    settings: {
      ...state.settings,
      bankLinks: Object.keys(bankLinks).length > 0 ? bankLinks : undefined,
      ledgerViews: state.settings.ledgerViews?.map((view) =>
        view.accountId === id ? { ...view, accountId: "" } : view,
      ),
    },
  };
};
