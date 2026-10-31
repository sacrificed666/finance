import type { AppState } from "@/features/data/model/types";
import type { MessageKey } from "@/shared/i18n/messages/en";

export interface StartStep {
  id: "accounts" | "income" | "expense";
  href: string;
  title: MessageKey;
  hint: MessageKey;
  done: boolean;
}

// The first steps with the app, each done once its data is there
export const startSteps = (state: AppState): StartStep[] => [
  {
    id: "accounts",
    href: "/accounts",
    title: "dash.empty.accounts",
    hint: "dash.start.accounts",
    done: state.savings.length > 0,
  },
  {
    id: "income",
    href: "/income",
    title: "dash.empty.income",
    hint: "dash.start.income",
    done: state.transactions.some((tx) => tx.type === "income"),
  },
  {
    id: "expense",
    href: "/transactions",
    title: "dash.start.expense",
    hint: "dash.start.expense.hint",
    done: state.transactions.some((tx) => tx.type === "expense"),
  },
];
