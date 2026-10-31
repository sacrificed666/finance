import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import RecentCard from "./RecentCard";

// An expense with a note on a date
const entry = (id: string, date: string, note: string): Transaction => ({
  id,
  type: "expense",
  amount: 100,
  currency: "UAH",
  categoryId: "cat-groceries",
  date,
  note,
});

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "card", name: "Mono Black", icon: "💳", kind: "card", currency: "UAH", openingBalance: 0 }],
  transactions: [
    entry("a", "2026-10-01", "Bread"),
    { ...entry("b", "2026-10-09", "Milk"), accountId: "card" },
    entry("c", "2026-10-30", "Rent"),
    entry("d", "2026-10-09", "Coffee"),
  ],
};

describe("RecentCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the entries logged up to today, the newest first, and opens one to fix it", async () => {
    const { user } = renderWithStore(<RecentCard />, { state });
    expect(screen.getByRole("link", { name: /Expenses/u })).toHaveAttribute("href", "/transactions");
    const rows = screen.getAllByRole("button");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Coffee"),
      expect.stringContaining("Milk"),
      expect.stringContaining("Bread"),
    ]);
    expect(screen.getAllByText("9 Oct · Groceries")).toHaveLength(2);
    expect(screen.queryByText(/Mono Black/u)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Milk/u }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByDisplayValue("Milk")).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says where the entries will show up before the first one", () => {
    renderWithStore(<RecentCard />);
    expect(screen.getByText("Nothing logged yet")).toBeInTheDocument();
  });
});
