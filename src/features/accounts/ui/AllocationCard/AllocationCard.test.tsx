import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import AllocationCard from "./AllocationCard";

// Hryvnias on a card, half of them changed into dollar cash in September
const state: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, rates: { USD: 40, EUR: 45 } },
  savings: [
    { id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 2000 },
    { id: "usd", name: "Dollars", icon: "💵", kind: "cash", currency: "USD", openingBalance: 0 },
  ],
  transactions: [
    {
      id: "pay",
      type: "income",
      amount: 1000,
      currency: "UAH",
      categoryId: "cat-salary",
      date: "2026-08-05",
      accountId: "card",
    },
    {
      id: "buy",
      type: "transfer",
      amount: 1500,
      currency: "UAH",
      categoryId: "",
      date: "2026-09-10",
      accountId: "card",
      toAccountId: "usd",
      toAmount: 37.5,
    },
  ],
};

// The legend's rows, each a part's name and its latest share
const shares = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

describe("AllocationCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-20T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the latest shares and switches to currencies", async () => {
    const { user } = renderWithStore(<AllocationCard />, { state });
    expect(screen.getByRole("heading", { name: "Allocation over time" })).toBeInTheDocument();
    expect(shares()).toEqual(["💳 Card50%", "💵 Cash50%"]);
    await user.click(screen.getByRole("radio", { name: "Currency" }));
    expect(shares()).toEqual(["₴ UAH50%", "$ USD50%"]);
  });

  it("stays away before there are two months to compare", () => {
    const fresh: AppState = { ...state, transactions: [] };
    const { container } = renderWithStore(<AllocationCard />, { state: fresh });
    expect(container).toBeEmptyDOMElement();
  });
});
