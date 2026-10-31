import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import SpendingOverview from "./SpendingOverview";

// An expense in hryvnias
const spend = (amount: number, date: string, categoryId: string): Transaction => ({
  id: `${date}:${categoryId}`,
  type: "expense",
  amount,
  currency: "UAH",
  categoryId,
  date,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    spend(300, "2026-09-02", "cat-groceries"),
    spend(400, "2026-10-01", "cat-groceries"),
    spend(200, "2026-10-02", "cat-coffee"),
  ],
};

describe("SpendingOverview", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-04T12:00:00"), toFake: ["Date"] });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("breaks the month down by group and, on request, by category", async () => {
    const { user } = renderWithStore(<SpendingOverview month="2026-10" />, { state });
    expect(screen.getByRole("heading", { name: "Where it went" })).toBeInTheDocument();
    expect(screen.getAllByText("Food").length).toBeGreaterThan(0);
    expect(screen.queryByText("Coffee & Snacks")).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Detailed" }));
    expect(screen.getAllByText("Coffee & Snacks").length).toBeGreaterThan(0);
  });

  it("stays away until something is logged", () => {
    const { container } = renderWithStore(<SpendingOverview month="2026-10" />);
    expect(container).toBeEmptyDOMElement();
  });
});
