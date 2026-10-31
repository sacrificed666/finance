import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, RecurringRule } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import RecurringCard from "./RecurringCard";

// A monthly rule with the given fields
const rule = (over: Partial<RecurringRule> & Pick<RecurringRule, "id">): RecurringRule => ({
  type: "expense",
  amount: 1000,
  currency: "UAH",
  categoryId: "cat-rent",
  dayOfMonth: 5,
  startMonth: "2026-01",
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  recurring: [
    rule({ id: "rent", amount: 12000, dayOfMonth: 20 }),
    rule({ id: "salary", type: "income", amount: 40000, categoryId: "cat-salary", dayOfMonth: 10 }),
    rule({ id: "gym", categoryId: "cat-groceries", startMonth: "2027-01", note: "Plan" }),
    rule({ id: "food", categoryId: "cat-groceries", amount: 6000, endMonth: "2026-12" }),
  ],
  budgets: [{ categoryId: "cat-groceries", limit: 6000, currency: "UAH" }],
};

describe("RecurringCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-15T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sums up the running rules and lists them by day", () => {
    renderWithStore(<RecurringCard month="2026-10" />, { state });
    expect(screen.getByText("3 recurring rules · next on 20 Oct")).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows).toEqual([
      expect.stringContaining("day 5 of each month"),
      expect.stringContaining("day 10 of each month"),
      expect.stringContaining("day 20 of each month"),
    ]);
  });

  it("shows the waiting rules on request", async () => {
    const { user } = renderWithStore(<RecurringCard month="2026-10" />, { state });
    await user.click(screen.getByRole("radio", { name: /Upcoming/u }));
    const [row] = screen.getAllByRole("listitem");
    expect(within(row!).getByText("upcoming")).toBeInTheDocument();
    expect(row!.querySelector("button")?.className).toMatch(/idle/u);
  });

  it("offers to stop the rules that book a budget as spent", async () => {
    const { user } = renderWithStore(<RecurringCard month="2026-10" />, { state });
    expect(screen.getByText("1 rule books its budget as spent")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Choose which to stop" }));
    expect(screen.getByRole("dialog", { name: "Stop spending plans" })).toBeInTheDocument();
  });

  it("invites to add the first rule", () => {
    renderWithStore(<RecurringCard month="2026-10" />);
    expect(screen.getByText("No recurring payments")).toBeInTheDocument();
  });
});
