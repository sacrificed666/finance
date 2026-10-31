import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import CashAheadCard from "./CashAheadCard";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 1000 }],
  subscriptions: [
    {
      id: "music",
      name: "Music",
      icon: "🎵",
      price: 100,
      currency: "UAH",
      period: "monthly",
      dayOfMonth: 20,
      startMonth: "2026-10",
      active: true,
    },
  ],
  transactions: [
    {
      id: "rent",
      type: "expense",
      amount: 1500,
      currency: "UAH",
      categoryId: "cat-housing",
      date: "2026-10-11",
      note: "Rent",
    },
    { id: "pay", type: "income", amount: 2000, currency: "UAH", categoryId: "cat-salary", date: "2026-10-15" },
    { id: "fee", type: "expense", amount: 30, currency: "UAH", categoryId: "cat-groceries", date: "2026-10-15" },
    {
      id: "sub",
      type: "expense",
      amount: 100,
      currency: "UAH",
      categoryId: "cat-subs",
      date: "2026-10-20",
      subscriptionId: "music",
    },
    { id: "later", type: "expense", amount: 50, currency: "UAH", categoryId: "cat-groceries", date: "2026-11-30" },
  ],
};

describe("CashAheadCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("warns when the money drops below zero and counts the planned entries", () => {
    renderWithStore(<CashAheadCard />, { state });
    expect(screen.getByText(/^Drops below zero on/u)).toBeInTheDocument();
    expect(screen.getByText(/1,000 ₴ in cash and cards today · 4 entries/u)).toBeInTheDocument();
    expect(screen.queryByText("Rent")).not.toBeInTheDocument();
  });

  it("looks two months ahead on request", async () => {
    const { user } = renderWithStore(<CashAheadCard />, { state });
    await user.click(screen.getByRole("radio", { name: "60 d" }));
    expect(screen.getByText("Next 60 days")).toBeInTheDocument();
    expect(screen.getByText(/· 5 entries/u)).toBeInTheDocument();
  });
});
