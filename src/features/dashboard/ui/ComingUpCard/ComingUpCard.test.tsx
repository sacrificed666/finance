import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { profileFromRegime } from "@/features/income/model/tax";
import { renderWithStore } from "@/test/render";

import ComingUpCard from "./ComingUpCard";

const state: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, tax: profileFromRegime("fop3") },
  receivables: [
    {
      id: "oleh",
      name: "Oleh",
      icon: "🤝",
      amount: 4000,
      currency: "UAH",
      date: "2026-09-01",
      dueDate: "2026-10-30",
      repaid: 1500,
    },
  ],
  transactions: [
    {
      id: "rent",
      type: "expense",
      amount: 15000,
      currency: "UAH",
      categoryId: "cat-rent",
      date: "2026-11-01",
      recurringId: "rule",
    },
    {
      id: "tv",
      type: "expense",
      amount: 399,
      currency: "UAH",
      categoryId: "cat-rent",
      date: "2026-11-02",
      note: "Netflix",
      subscriptionId: "sub",
    },
  ],
};

describe("ComingUpCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dates what falls due, overdue first, with money in and out told apart", () => {
    renderWithStore(<ComingUpCard />, { state });
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent(/Overdue since 20 Oct/u);
    expect(rows[1]).toHaveTextContent(/^30Oct🤝OlehOwed to you\+2,500\s₴$/u);
    expect(screen.getByText("Recurring")).toBeInTheDocument();
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("Subscription")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Calendar/u })).toHaveAttribute("href", "/calendar");
  });

  it("names a regular income it expects again", () => {
    const paid = ["2026-07-05", "2026-08-05", "2026-09-04", "2026-10-05"].map((date, index) => ({
      id: `fee${String(index)}`,
      type: "income" as const,
      amount: 3000,
      currency: "UAH" as const,
      categoryId: "cat-freelance",
      date,
    }));
    vi.setSystemTime(new Date("2026-10-26T12:00:00"));
    renderWithStore(<ComingUpCard />, { state: { ...DEFAULT_STATE, transactions: paid } });
    expect(screen.getByText("Freelance")).toBeInTheDocument();
    expect(screen.getByText("Expected, comes every month")).toBeInTheDocument();
    expect(screen.getByText("+3,000 ₴")).toBeInTheDocument();
  });

  it("says so when nothing is due", () => {
    const quiet: AppState = {
      ...DEFAULT_STATE,
      settings: { ...DEFAULT_STATE.settings, tax: { ...DEFAULT_STATE.settings.tax, regime: "none" } },
    };
    renderWithStore(<ComingUpCard />, { state: quiet });
    expect(screen.getByText("Nothing is due in the next two weeks")).toBeInTheDocument();
  });
});
