import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { SavingsAccount } from "@/features/data/model/types";

import {
  accountFields,
  accountProblem,
  addHolding,
  initialAccountForm,
  saveAccount,
  switchAccountKind,
  type AccountForm,
} from "./accountForm";

// Counts up from one, to stand in for random ids
const counter = () => {
  let next = 0;
  return () => `id-${String(++next)}`;
};

// A filled form of a card account
const card = (over: Partial<AccountForm> = {}): AccountForm => ({
  ...initialAccountForm("new", counter()),
  name: "Black card",
  ...over,
});

describe("initialAccountForm", () => {
  it("fills the form of a stored account with its goal", () => {
    const stored: SavingsAccount = {
      id: "a",
      name: "Jar",
      icon: "🫙",
      kind: "savings",
      currency: "UAH",
      openingBalance: 500,
      goal: { target: 10000, deadline: "2027-01-01" },
    };
    expect(initialAccountForm(stored, counter())).toMatchObject({
      id: "a",
      openingBalance: "500",
      goalEnabled: true,
      target: "10000",
      deadline: "2027-01-01",
    });
  });
});

describe("switchAccountKind", () => {
  it("turns a fresh card into a dollar crypto wallet with one coin", () => {
    const wallet = switchAccountKind(card(), "crypto", counter());
    expect(wallet).toMatchObject({ kind: "crypto", currency: "USD", icon: "🪙" });
    expect(wallet.holdings).toHaveLength(1);
    expect(addHolding(wallet, counter()).holdings).toHaveLength(2);
  });
});

describe("accountProblem", () => {
  it("names the first thing to fix", () => {
    expect(accountProblem(card())).toBeNull();
    expect(accountProblem(card({ name: " " }))?.key).toBe("balance.acc.problem.name");
    expect(accountProblem(card({ openingBalance: "abc" }))?.key).toBe("balance.acc.problem.opening");
    expect(accountProblem(card({ goalEnabled: true, target: "0" }))?.key).toBe("balance.acc.problem.goal");
    const skins = card({ kind: "skins", game: "custom", gameName: "Game", gameLogo: "http://x" });
    expect(accountProblem(skins)?.key).toBe("balance.acc.problem.gameLogo");
  });

  it("names the coin without an amount", () => {
    const wallet = switchAccountKind(card(), "crypto", counter());
    expect(accountProblem(wallet)).toEqual({ key: "balance.crypto.problem.amount", params: { coin: "BTC" } });
  });
});

describe("saving", () => {
  it("keeps only the fields of the account's kind", () => {
    const fields = accountFields(card({ openingBalance: "", bank: "mono", goalEnabled: false }));
    expect(fields).toMatchObject({ name: "Black card", openingBalance: 0, bank: "mono", holdings: undefined });
    expect(fields.game).toBeUndefined();
  });

  it("adds an account and changes it in place", () => {
    const added = saveAccount(DEFAULT_STATE, card(), counter());
    expect(added.savings).toEqual([expect.objectContaining({ id: "id-1", name: "Black card" })]);
    const form = { ...initialAccountForm(added.savings[0]!, counter()), name: "Renamed" };
    expect(saveAccount(added, form, counter()).savings).toEqual([
      expect.objectContaining({ id: "id-1", name: "Renamed" }),
    ]);
  });
});
