import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";

import { addQuickEntry, quickAccount, quickCategory } from "./quickAdd";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 0 }],
};

describe("quickCategory", () => {
  it("keeps a picked category of the type, or takes the type's first", () => {
    expect(quickCategory(state, "expense", "cat-taxi")).toBe("cat-taxi");
    const first = quickCategory(state, "income", "cat-taxi");
    expect(state.categories.find((entry) => entry.id === first)?.kind).toBe("income");
  });
});

describe("quickAccount", () => {
  it("keeps a picked account or no account, or takes the first", () => {
    expect(quickAccount(state, "")).toBe("");
    expect(quickAccount(state, "gone")).toBe("card");
    expect(quickAccount(state, null)).toBe("card");
    expect(quickAccount(DEFAULT_STATE, null)).toBe("");
  });
});

describe("addQuickEntry", () => {
  it("adds the entry, dropping an empty note and no account", () => {
    const next = addQuickEntry(
      state,
      {
        type: "expense",
        amount: 5,
        currency: "UAH",
        categoryId: "cat-coffee",
        accountId: "",
        note: "  ",
        date: "2026-10-10",
      },
      () => "new",
    );
    expect(next.transactions).toEqual([
      {
        id: "new",
        type: "expense",
        amount: 5,
        currency: "UAH",
        categoryId: "cat-coffee",
        date: "2026-10-10",
        note: undefined,
        accountId: undefined,
      },
    ]);
  });
});
