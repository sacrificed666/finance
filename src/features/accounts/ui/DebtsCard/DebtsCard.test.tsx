import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Debt } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import DebtsCard from "./DebtsCard";

const state: AppState = {
  ...DEFAULT_STATE,
  debts: [
    {
      id: "car",
      name: "Car",
      icon: "🏦",
      kind: "loan",
      currency: "UAH",
      balance: 12000,
      principal: 20000,
      annualRatePct: 12,
      monthlyPayment: 1000,
    },
    {
      id: "stuck",
      name: "Card",
      icon: "💳",
      kind: "card",
      currency: "UAH",
      balance: 50000,
      annualRatePct: 50,
      monthlyPayment: 100,
    },
  ],
};

describe("DebtsCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sums the payments of several debts, then shows each one's progress and payoff", () => {
    renderWithStore(<DebtsCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(debt: Debt) => void>()} />, { state });
    expect(screen.getByText(/^8,000 ₴ of 20K ₴ paid off \(40%\)/u)).toBeInTheDocument();
    expect(screen.getByText(/this balance grows/u)).toBeInTheDocument();
    expect(screen.getByText("2 liabilities")).toBeInTheDocument();
    expect(screen.queryByText("−62K ₴")).not.toBeInTheDocument();
    expect(screen.getByText("1,100 ₴")).toBeInTheDocument();
  });

  it("leaves the payments panel out for a single debt", () => {
    renderWithStore(<DebtsCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(debt: Debt) => void>()} />, {
      state: { ...state, debts: state.debts.slice(0, 1) },
    });
    expect(screen.getByText("Car")).toBeInTheDocument();
    expect(screen.getByText("1 liability")).toBeInTheDocument();
  });

  it("opens the payoff planner", async () => {
    const { user } = renderWithStore(<DebtsCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(debt: Debt) => void>()} />, {
      state,
    });
    await user.click(screen.getByRole("button", { name: "Plan the payoff" }));
    expect(screen.getByRole("dialog", { name: "Pay the debts off sooner" })).toBeInTheDocument();
  });

  it("stays away without debts", () => {
    const { container } = renderWithStore(
      <DebtsCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(debt: Debt) => void>()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("lists a purchase paid in parts with what is left, even without debts", () => {
    const withPlan: AppState = {
      ...DEFAULT_STATE,
      recurring: [
        {
          id: "phone",
          type: "expense",
          amount: 3000,
          currency: "UAH",
          categoryId: "cat-electronics",
          note: "Phone",
          dayOfMonth: 5,
          startMonth: "2026-09",
          endMonth: "2026-12",
          instalment: { total: 12000, count: 4 },
        },
      ],
      transactions: [
        {
          id: "p1",
          type: "expense",
          amount: 3000,
          currency: "UAH",
          categoryId: "cat-electronics",
          date: "2026-09-05",
          recurringId: "phone",
        },
        {
          id: "p2",
          type: "expense",
          amount: 3000,
          currency: "UAH",
          categoryId: "cat-electronics",
          date: "2026-10-05",
          recurringId: "phone",
        },
        {
          id: "p3",
          type: "expense",
          amount: 3000,
          currency: "UAH",
          categoryId: "cat-electronics",
          date: "2026-11-05",
          recurringId: "phone",
        },
      ],
    };
    renderWithStore(<DebtsCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(debt: Debt) => void>()} />, {
      state: withPlan,
    });
    expect(screen.getByRole("link", { name: /Phone/u })).toHaveAttribute("href", "/transactions");
    expect(screen.getByRole("link", { name: /Phone/u })).toHaveTextContent("−6,000.00");
    expect(screen.getByText("2 of 4 payments · the last in December 2026")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /payoff/iu })).not.toBeInTheDocument();
  });
});
