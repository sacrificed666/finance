import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import TransactionsPage from "./TransactionsPage";

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    { id: "milk", type: "expense", amount: 85, currency: "UAH", categoryId: "cat-groceries", date: "2026-10-02" },
    { id: "rent", type: "expense", amount: 9000, currency: "UAH", categoryId: "cat-rent", date: "2026-10-01" },
  ],
};

// The texts of the ledger rows, found by their spent amounts
const rows = () => screen.getAllByRole("button", { name: /−.*₴/u }).map((row) => row.textContent);

describe("TransactionsPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-15T12:00:00"), toFake: ["Date"] });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the month's figures, the ledger and the plans", () => {
    renderWithStore(<TransactionsPage />, { state });
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    for (const card of ["Where it went", "Ledger", "Recurring", "Budgets"]) {
      expect(screen.getByRole("heading", { name: card })).toBeInTheDocument();
    }
  });

  it("narrows the ledger to a category from its tile and lets go on a second press", async () => {
    const { user } = renderWithStore(<TransactionsPage />, { state });
    expect(rows()).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: /^Housing:/u }));
    expect(rows()).toEqual([expect.stringContaining("9,000")]);
    expect(screen.getByRole("button", { name: "Filters 1" })).toBeInTheDocument();
    expect(screen.getByText("October 2026 · In the ledger: Housing")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Housing:/u }));
    expect(rows()).toHaveLength(2);
  });

  it("finds a top place's entries in the ledger and lets go on a second press", async () => {
    const places: AppState = {
      ...state,
      transactions: [
        { ...state.transactions[0]!, id: "s1", note: "Silpo", amount: 300 },
        { ...state.transactions[0]!, id: "s2", note: "Silpo", amount: 200, date: "2026-10-05" },
        { ...state.transactions[0]!, id: "u1", note: "Uklon", amount: 150, categoryId: "cat-taxi" },
      ],
    };
    const { user } = renderWithStore(<TransactionsPage />, { state: places });
    expect(rows()).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: /^Silpo/u, pressed: false }));
    expect(rows()).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: /^Silpo/u, pressed: true }));
    expect(rows()).toHaveLength(3);
  });

  it("opens narrowed to the category a link names", () => {
    renderWithStore(<TransactionsPage category="cat-housing" />, { state });
    expect(rows()).toEqual([expect.stringContaining("9,000")]);
    expect(screen.getByRole("button", { name: /^Housing:/u })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens an empty entry from the header", async () => {
    const { user } = renderWithStore(<TransactionsPage />, { state });
    await user.click(screen.getAllByRole("button", { name: "Add" })[0]!);
    expect(await screen.findByRole("dialog", { name: "New transaction" })).toBeInTheDocument();
  });
});
