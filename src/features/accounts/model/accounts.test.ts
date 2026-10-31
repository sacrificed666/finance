import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Category, SavingsAccount, Transaction } from "@/features/data/model/types";

import {
  accountUsage,
  activeAccounts,
  archiveAccount,
  deleteAccount,
  pickableAccounts,
  type DeletedAccountLabels,
} from "./accounts";

const LABELS: DeletedAccountLabels = {
  from: (name) => `From ${name}`,
  to: (name) => `To ${name}`,
  unnamed: "an account",
};

// A plain account in a currency
const account = (id: string, currency: SavingsAccount["currency"] = "UAH"): SavingsAccount => ({
  id,
  name: id === "card" ? "Card" : "Cash",
  icon: "💳",
  kind: "card",
  currency,
  openingBalance: 0,
});

const SPEND: Transaction = {
  id: "e1",
  type: "expense",
  amount: 50,
  currency: "UAH",
  categoryId: "cat-food",
  date: "2026-10-01",
  accountId: "card",
};
const IN: Transaction = {
  id: "t1",
  type: "transfer",
  amount: 100,
  currency: "UAH",
  categoryId: "",
  date: "2026-10-02",
  accountId: "card",
  toAccountId: "cash",
};
const OUT: Transaction = {
  id: "t2",
  type: "transfer",
  amount: 40,
  currency: "UAH",
  categoryId: "",
  date: "2026-10-03",
  accountId: "cash",
  toAccountId: "card",
  toAmount: 1,
  note: "Change",
};
const ELSEWHERE: Transaction = {
  id: "t3",
  type: "transfer",
  amount: 5,
  currency: "UAH",
  categoryId: "",
  date: "2026-10-04",
  accountId: "cash",
  toAccountId: "jar",
};

// An account's records with two accounts, a rule and a subscription
const STATE: AppState = {
  ...DEFAULT_STATE,
  savings: [account("card"), account("cash", "USD")],
  transactions: [SPEND, IN, OUT, ELSEWHERE],
  recurring: [
    {
      id: "r1",
      type: "expense",
      amount: 10,
      currency: "UAH",
      categoryId: "cat-food",
      dayOfMonth: 1,
      startMonth: "2026-01",
      accountId: "card",
    },
  ],
  subscriptions: [
    {
      id: "s1",
      name: "Music",
      icon: "🎵",
      price: 5,
      currency: "USD",
      period: "monthly",
      dayOfMonth: 2,
      startMonth: "2026-01",
      active: true,
      accountId: "card",
    },
  ],
};

describe("accounts", () => {
  it("counts what points at an account", () => {
    expect(accountUsage(STATE, "card")).toEqual({ entries: 1, transfers: 2, recurring: 1, subscriptions: 1 });
    expect(accountUsage(STATE, "jar")).toEqual({ entries: 0, transfers: 1, recurring: 0, subscriptions: 0 });
  });

  it("turns the transfers of a deleted account into income and costs of the other side", () => {
    const next = deleteAccount(STATE, "card", LABELS);
    expect(next.savings.map((entry) => entry.id)).toEqual(["cash"]);
    expect(next.transactions).toEqual([
      { ...SPEND, accountId: undefined },
      {
        id: "t1",
        type: "income",
        amount: 100,
        currency: "USD",
        categoryId: "cat-other-inc",
        date: "2026-10-02",
        note: "From Card",
        accountId: "cash",
      },
      {
        id: "t2",
        type: "expense",
        amount: 40,
        currency: "UAH",
        categoryId: "cat-other-exp",
        date: "2026-10-03",
        note: "Change",
        accountId: "cash",
      },
      ELSEWHERE,
    ]);
    expect(next.recurring[0]?.accountId).toBeUndefined();
    expect(next.subscriptions[0]?.accountId).toBeUndefined();
  });

  it("falls back to any category of the kind and drops what cannot be kept", () => {
    const categories: Category[] = [
      { id: "spend", name: "Spend", icon: "💸", colorSlot: 1, kind: "expense" },
      { id: "earn", name: "Earn", icon: "💰", colorSlot: 2, kind: "income" },
    ];
    const next = deleteAccount({ ...STATE, categories, savings: [account("cash")] }, "card", LABELS);
    expect(next.transactions.find((tx) => tx.id === "t1")).toMatchObject({
      categoryId: "earn",
      note: "From an account",
    });
    expect(next.transactions.find((tx) => tx.id === "t2")).toMatchObject({ categoryId: "spend" });

    const bare = deleteAccount({ ...STATE, categories: [], savings: [] }, "card", LABELS);
    expect(bare.transactions.map((tx) => tx.id)).toEqual(["e1", "t3"]);
    const both: Transaction = { ...IN, id: "self", toAccountId: "card", accountId: "card" };
    expect(deleteAccount({ ...STATE, transactions: [both] }, "card", LABELS).transactions).toEqual([]);
  });
});

describe("deleteAccount and what points at the account", () => {
  it("unlinks the account from goals, bank cards and saved views", () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      savings: [account("card"), account("cash")],
      goals: [
        { id: "g1", name: "Trip", icon: "🎯", target: 100, currency: "UAH", saved: 0, accountIds: ["card", "cash"] },
        { id: "g2", name: "Car", icon: "🚗", target: 100, currency: "UAH", saved: 10, accountIds: ["card"] },
      ],
      settings: {
        ...DEFAULT_STATE.settings,
        bankLinks: { mono1: "card", mono2: "cash" },
        ledgerViews: [
          {
            id: "v1",
            name: "Card",
            kind: "all",
            scope: "month",
            query: "",
            categoryId: "",
            accountId: "card",
            tag: "",
            timing: "all",
          },
        ],
      },
    };
    const next = deleteAccount(state, "card", LABELS);
    expect(next.goals.map((goal) => goal.accountIds)).toEqual([["cash"], undefined]);
    expect(next.settings.bankLinks).toEqual({ mono2: "cash" });
    expect(next.settings.ledgerViews?.[0]?.accountId).toBe("");
    expect(
      deleteAccount({ ...state, settings: { ...state.settings, bankLinks: { mono1: "card" } } }, "card", LABELS)
        .settings.bankLinks,
    ).toBeUndefined();
  });
});

describe("the archive", () => {
  it("puts an account away from the pickers and takes it back", () => {
    const state: AppState = { ...DEFAULT_STATE, savings: [account("card"), account("cash")] };
    const archived = archiveAccount(state, "cash", true);
    expect(archived.savings[1]).toMatchObject({ id: "cash", archived: true });
    expect(activeAccounts(archived.savings).map((item) => item.id)).toEqual(["card"]);
    expect(pickableAccounts(archived.savings, ["cash"]).map((item) => item.id)).toEqual(["card", "cash"]);
    expect(archiveAccount(archived, "cash", false).savings[1]).toEqual(account("cash"));
  });
});
