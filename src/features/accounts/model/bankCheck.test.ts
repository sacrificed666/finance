import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import type { BankAccount } from "@/features/import/api/bank";

import { bankCheckRows } from "./bankCheck";

// A Monobank card with a balance
const bank = (id: string, balance: number, currency: BankAccount["currency"] = "UAH"): BankAccount => ({
  id,
  kind: "card",
  currency,
  type: "black",
  maskedPan: "4444",
  balance,
});

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [
    { id: "black", name: "Black", icon: "💳", kind: "card", currency: "UAH", openingBalance: 1000 },
    { id: "usd", name: "Dollars", icon: "💵", kind: "card", currency: "USD", openingBalance: 10 },
  ],
  settings: { ...DEFAULT_STATE.settings, bankLinks: { m1: "black", m2: "usd", m3: "gone" } },
};

describe("bankCheckRows", () => {
  it("compares each linked account with the app's balance", () => {
    const rows = bankCheckRows(
      state,
      [bank("m1", 1200.4), bank("m2", 10, "EUR"), bank("m3", 5), bank("m4", 1)],
      "2026-10-10",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ app: 1000, diff: 200.4 });
    expect(rows[0]?.account.id).toBe("black");
  });
});
