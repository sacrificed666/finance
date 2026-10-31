import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import SpendingCard from "./SpendingCard";

const state: AppState = {
  ...DEFAULT_STATE,
  budgets: [{ categoryId: "cat-food", limit: 500, currency: "UAH" }],
  transactions: [
    { id: "milk", type: "expense", amount: 600, currency: "UAH", categoryId: "cat-groceries", date: "2026-10-02" },
    { id: "taxi", type: "expense", amount: 200, currency: "UAH", categoryId: "cat-taxi", date: "2026-10-03" },
    { id: "old", type: "expense", amount: 1000, currency: "UAH", categoryId: "cat-taxi", date: "2026-09-03" },
  ],
};

describe("SpendingCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invites to add the first expense", () => {
    renderWithStore(<SpendingCard />);
    expect(screen.getByText("No spending this month")).toBeInTheDocument();
  });

  it("splits the month by category under what the budgets have left", () => {
    renderWithStore(<SpendingCard />, { state });
    expect(screen.queryByText("−200 ₴ vs last month")).not.toBeInTheDocument();
    expect(screen.getByText("100 ₴ over")).toBeInTheDocument();
    expect(screen.getByText(/1 over the line/u)).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Breakdown by category" })).toBeInTheDocument();
    const tiles = screen.getAllByRole("link").filter((link) => link.hasAttribute("aria-label"));
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.map((tile) => tile.getAttribute("href"))).toEqual(
      tiles.map(() => expect.stringMatching(/^\/transactions\?category=cat-/u)),
    );
  });
});
