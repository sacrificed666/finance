import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, SavingsAccount, Transaction } from "@/features/data/model/types";

import {
  entryProblem,
  initialEntryForm,
  knownTags,
  saveEntry,
  splitTotalIn,
  switchEntryType,
  type EntryForm,
} from "./entryForm";

// An account in a currency
const account = (id: string, currency: SavingsAccount["currency"] = "UAH"): SavingsAccount => ({
  id,
  name: id,
  icon: "💳",
  kind: "card",
  currency,
  openingBalance: 0,
});

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [account("card"), account("dollars", "USD")],
  transactions: [
    {
      id: "a",
      type: "expense",
      amount: 10,
      currency: "UAH",
      categoryId: "cat-food",
      date: "2026-10-01",
      tags: ["trip"],
    },
    {
      id: "b",
      type: "expense",
      amount: 20,
      currency: "UAH",
      categoryId: "cat-food",
      date: "2026-10-02",
      tags: ["home", "trip"],
    },
  ],
};

// A filled expense form
const expense = (over: Partial<EntryForm> = {}): EntryForm => ({
  ...initialEntryForm(state, "new", "2026-10", "2026-10-15"),
  amount: "100",
  ...over,
});

// Counts up from one, to stand in for random ids
const counter = () => {
  let next = 0;
  return () => `id-${String(++next)}`;
};

describe("initialEntryForm", () => {
  it("dates a new entry today in this month and on the first in another", () => {
    expect(initialEntryForm(state, "new", "2026-10", "2026-10-15").date).toBe("2026-10-15");
    expect(initialEntryForm(state, "new", "2026-08", "2026-10-15").date).toBe("2026-08-01");
    expect(initialEntryForm(state, "new", "2026-08", "2026-10-15", "2026-08-09").date).toBe("2026-08-09");
  });

  it("asks for a transfer only with two accounts", () => {
    expect(initialEntryForm(state, "new", "2026-10", "2026-10-15", undefined, "transfer").type).toBe("transfer");
    const single = { ...state, savings: [account("card")] };
    expect(initialEntryForm(single, "new", "2026-10", "2026-10-15", undefined, "transfer").type).toBe("expense");
  });

  it("fills the form of an existing entry", () => {
    expect(initialEntryForm(state, state.transactions[0]!, "2026-10", "2026-10-15")).toMatchObject({
      id: "a",
      amount: "10",
      tags: ["trip"],
    });
  });
});

describe("switchEntryType", () => {
  it("picks two accounts and drops the split for a transfer", () => {
    const form = switchEntryType(state, expense({ splits: [{ key: "k", categoryId: "", amount: "1" }] }), "transfer");
    expect(form).toMatchObject({ type: "transfer", categoryId: "", accountId: "card", toAccountId: "dollars" });
    expect(form.splits).toEqual([]);
    expect(switchEntryType(state, form, "income").categoryId).not.toBe("");
  });
});

describe("knownTags", () => {
  it("puts the most used tags first", () => {
    expect(knownTags(state)).toEqual(["trip", "home"]);
  });
});

describe("entryProblem", () => {
  it("checks the amount, the split, the date and the category", () => {
    expect(entryProblem(state, expense())).toBeNull();
    expect(entryProblem(state, expense({ amount: "0" }))?.key).toBe("problem.amount");
    expect(entryProblem(state, expense({ splits: [{ key: "k", categoryId: "cat-rent", amount: "100" }] }))?.key).toBe(
      "tx.split.problem",
    );
    expect(entryProblem(state, expense({ date: "" }))?.key).toBe("problem.date");
    expect(entryProblem(state, expense({ categoryId: "" }))?.key).toBe("problem.category");
  });

  it("checks the accounts of a transfer and what arrived in another currency", () => {
    const transfer = switchEntryType(state, expense(), "transfer");
    expect(entryProblem(state, { ...transfer, toAccountId: "" })?.key).toBe("tx.problem.bothAccounts");
    expect(entryProblem(state, { ...transfer, toAccountId: "card" })?.key).toBe("tx.problem.sameAccount");
    expect(entryProblem(state, transfer)).toEqual({ key: "tx.problem.arrived", params: { name: "dollars" } });
    expect(entryProblem(state, { ...transfer, toAmount: "2.5" })).toBeNull();
  });
});

describe("saveEntry", () => {
  it("adds an entry with its split parts under one split id", () => {
    const form = expense({ splits: [{ key: "k", categoryId: "cat-rent", amount: "30" }], tags: ["trip"] });
    const saved = saveEntry(state, form, "new", counter());
    const added = saved.transactions.slice(2);
    expect(added.map((tx) => [tx.id, tx.amount, tx.categoryId, tx.splitId])).toEqual([
      ["id-3", 70, form.categoryId, "id-1"],
      ["id-2", 30, "cat-rent", "id-1"],
    ]);
  });

  it("changes an entry in place and keeps where it came from", () => {
    const imported: Transaction = { ...state.transactions[0]!, externalId: "bank-1" };
    const form = initialEntryForm(state, imported, "2026-10", "2026-10-15");
    const saved = saveEntry(
      { ...state, transactions: [imported] },
      { ...form, amount: "12", tags: [] },
      imported,
      counter(),
    );
    expect(saved.transactions).toEqual([expect.objectContaining({ id: "a", amount: 12, externalId: "bank-1" })]);
    expect(saved.transactions[0]?.tags).toBeUndefined();
  });

  it("keeps what the bank said and an income's tax through an edit", () => {
    const bank = { time: 1_761_000_000, opAmount: 20, opCurrency: "USD" as const };
    const imported: Transaction = { ...state.transactions[0]!, externalId: "mono:1", bank };
    const form = initialEntryForm(state, imported, "2026-10", "2026-10-15");
    const saved = saveEntry(
      { ...state, transactions: [imported] },
      { ...form, categoryId: "cat-cafe" },
      imported,
      counter(),
    );
    expect(saved.transactions[0]).toMatchObject({ categoryId: "cat-cafe", bank });

    const tax = { ratePct: 6, fixedUAH: 0, gross: 1000 };
    const income: Transaction = { ...state.transactions[0]!, type: "income", categoryId: "cat-salary", tax };
    const incomeForm = initialEntryForm(state, income, "2026-10", "2026-10-15");
    const kept = saveEntry({ ...state, transactions: [income] }, { ...incomeForm, note: "May" }, income, counter());
    expect(kept.transactions[0]?.tax).toEqual(tax);
    const asExpense = switchEntryType(state, incomeForm, "expense");
    const dropped = saveEntry({ ...state, transactions: [income] }, asExpense, income, counter());
    expect(dropped.transactions[0]?.tax).toBeUndefined();
  });

  it("records what arrived of a transfer in another currency", () => {
    const transfer = { ...switchEntryType(state, expense(), "transfer"), toAmount: "2.5" };
    const [saved] = saveEntry(state, transfer, "new", counter()).transactions.slice(2);
    expect(saved).toMatchObject({ type: "transfer", amount: 100, currency: "UAH", toAmount: 2.5, categoryId: "" });
  });
});

describe("splitTotalIn", () => {
  it("adds up the parts in one currency", () => {
    expect(splitTotalIn(state, state.transactions, "UAH")).toBe(30);
  });
});

describe("an expense someone owes part of", () => {
  it("keeps my part in reports, leaves theirs out and records what they owe", () => {
    const form = expense({ amount: "1000", note: "Dinner", share: { name: " Oleh ", amount: "400" } });
    expect(entryProblem(state, form)).toBeNull();
    const next = saveEntry(state, form, "new", counter());
    const [mine, theirs] = next.transactions.slice(-2);
    expect(mine).toMatchObject({ amount: 600, note: "Dinner", splitId: "id-1" });
    expect(mine?.excluded).toBeUndefined();
    expect(theirs).toMatchObject({ id: "id-2", amount: 400, note: "Oleh", excluded: true, splitId: "id-1" });
    expect(next.receivables.at(-1)).toMatchObject({ name: "Oleh", amount: 400, repaid: 0, entryId: "id-2" });
  });

  it("asks for a name and a part smaller than the whole", () => {
    expect(entryProblem(state, expense({ share: { name: "", amount: "40" } }))?.key).toBe("tx.share.problem");
    expect(entryProblem(state, expense({ share: { name: "Oleh", amount: "100" } }))?.key).toBe("tx.share.problem");
  });
});
