import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { profileFromRegime } from "@/features/income/model/tax";
import { renderWithStore } from "@/test/render";

import InsightsRow from "./InsightsRow";

// The default account, which keeps no tax calendar
const quiet: AppState = DEFAULT_STATE;

// A sole proprietor of the third group, with its deadlines
const fop: AppState = { ...DEFAULT_STATE, settings: { ...DEFAULT_STATE.settings, tax: profileFromRegime("fop3") } };

// An expense on a day, at a place
const spent = (id: string, date: string, amount: number, categoryId: string, note: string) => ({
  id,
  type: "expense" as const,
  amount,
  currency: "UAH" as const,
  categoryId,
  date,
  note,
});

describe("InsightsRow", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:00:00"), toFake: ["Date"] });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks an overdue tax as paid on the spot", async () => {
    const { user, probe } = renderWithStore(<InsightsRow />, { state: fop });
    expect(screen.getByRole("region", { name: "Worth a look" })).toBeInTheDocument();
    expect(screen.getByText(/^5,707 ₴ · overdue since 20 Oct$/u)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mark as paid" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
    expect(Object.keys(probe.state.settings.taxPaid ?? {})).toHaveLength(1);
  });

  it("links a late loan, a budget past its limit and a category that moved to their pages", () => {
    renderWithStore(<InsightsRow />, {
      state: {
        ...quiet,
        receivables: [
          {
            id: "oleh",
            name: "Oleh",
            icon: "🤝",
            amount: 1000,
            currency: "UAH",
            date: "2026-09-01",
            dueDate: "2026-10-01",
            repaid: 0,
          },
        ],
        budgets: [{ categoryId: "cat-food", limit: 500, currency: "UAH" }],
        transactions: [
          { id: "now", type: "expense", amount: 800, currency: "UAH", categoryId: "cat-groceries", date: "2026-10-05" },
          {
            id: "before",
            type: "expense",
            amount: 200,
            currency: "UAH",
            categoryId: "cat-groceries",
            date: "2026-09-05",
          },
        ],
      },
    });
    expect(screen.getByRole("link", { name: /^Oleh owes you 1,000 ₴/u })).toHaveAttribute("href", "/accounts");
    expect(screen.getByRole("link", { name: /^Food is over budget/u })).toHaveAttribute("href", "/transactions");
    expect(screen.getByRole("link", { name: /^Food is up 300%/u })).toHaveAttribute("href", "/reports");
  });

  it("sums last month up in the first week and links to its report", () => {
    vi.setSystemTime(new Date("2026-10-03T12:00:00"));
    const state: AppState = {
      ...quiet,
      transactions: [
        { id: "pay", type: "income", amount: 20000, currency: "UAH", categoryId: "cat-salary", date: "2026-09-05" },
        { id: "rent", type: "expense", amount: 15000, currency: "UAH", categoryId: "cat-rent", date: "2026-09-01" },
      ],
    };
    renderWithStore(<InsightsRow />, { state });
    const recap = screen.getByRole("link", { name: /September 2026 in review: 25% of income kept/u });
    expect(recap).toHaveAttribute("href", "/reports?month=2026-09");
    expect(recap).toHaveTextContent("Spent 15K ₴ · came in 20K ₴ · most on Housing");
  });

  it("warns of an account running short, an unusual expense and a dearer bill", () => {
    const state: AppState = {
      ...quiet,
      savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 50000 }],
      transactions: [
        { ...spent("rent", "2026-10-27", 60000, "cat-rent", "Rent"), accountId: "card" },
        spent("a", "2026-08-03", 500, "cat-groceries", "Silpo"),
        spent("b", "2026-09-03", 600, "cat-groceries", "Silpo"),
        spent("c", "2026-09-20", 400, "cat-groceries", "Silpo"),
        spent("big", "2026-10-11", 2000, "cat-groceries", "Silpo"),
        ...["2026-06-10", "2026-07-10", "2026-08-10", "2026-09-10"].map((date, index) =>
          spent(`u${String(index)}`, date, 1450, "cat-utilities", "Utilities"),
        ),
        spent("now", "2026-10-10", 1650, "cat-utilities", "Utilities"),
      ],
    };
    renderWithStore(<InsightsRow />, { state });
    expect(screen.getByRole("link", { name: /Card may run short on 27 Oct/u })).toHaveAttribute("href", "/accounts");
    expect(screen.getByText(/Planned payments take it to .*10,000/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Unusually large: Silpo/u })).toHaveAttribute(
      "href",
      "/transactions?category=cat-groceries",
    );
    expect(screen.getByText("2,000 ₴, about 4× the usual")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Utilities went up 14%/u })).toBeInTheDocument();
    expect(screen.getByText("1,650 ₴ now, 1,450 ₴ before")).toBeInTheDocument();
  });

  it("stays away when there is nothing to point out", () => {
    const { container } = renderWithStore(<InsightsRow />, { state: quiet });
    expect(container).toBeEmptyDOMElement();
  });
});
