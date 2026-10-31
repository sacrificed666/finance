import { accountBalances } from "@/features/data/model/finmath";
import type { AppState, SavingsAccount } from "@/features/data/model/types";
import type { BankAccount } from "@/features/import/api/bank";

export interface BankCheckRow {
  bank: BankAccount;
  account: SavingsAccount;
  app: number;
  diff: number;
}

// Each linked bank account beside the app's balance of the same account
export const bankCheckRows = (state: AppState, accounts: readonly BankAccount[], today: string): BankCheckRow[] => {
  const links = state.settings.bankLinks ?? {};
  const balances = accountBalances(state, today);
  return accounts.flatMap((bank) => {
    const linked = links[bank.id];
    const account = linked ? state.savings.find((item) => item.id === linked) : undefined;
    if (!bank.currency || !account || account.currency !== bank.currency) return [];
    const app = balances.get(account.id) ?? 0;
    return [{ bank, account, app, diff: Math.round((bank.balance - app) * 100) / 100 }];
  });
};
