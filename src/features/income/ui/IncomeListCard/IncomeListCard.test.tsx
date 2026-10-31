import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import IncomeListCard from "./IncomeListCard";

// An income with the given fields
const income = (over: Partial<Transaction> & Pick<Transaction, "id" | "date" | "amount">): Transaction => ({
  type: "income",
  currency: "UAH",
  categoryId: "cat-salary",
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    income({ id: "sep", date: "2026-09-05", amount: 40000 }),
    income({ id: "oct", date: "2026-10-05", amount: 50000, note: "Bonus" }),
    income({
      id: "gig",
      date: "2026-10-07",
      amount: 900,
      categoryId: "cat-freelance",
      tax: { ratePct: 10, fixedUAH: 0, gross: 1000, regime: "custom", label: "Contract" },
    }),
    income({ id: "later", date: "2026-10-25", amount: 45000 }),
  ],
};

describe("IncomeListCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the received income by month with each month's total", () => {
    renderWithStore(<IncomeListCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(tx: Transaction) => void>()} />, {
      state,
    });
    const months = screen.getAllByRole("heading", { level: 3 }).map((head) => head.textContent);
    expect(months).toEqual([expect.stringContaining("October 2026"), expect.stringContaining("September 2026")]);
    expect(screen.getByText(/net of 100 ₴ tax · Contract/u)).toBeInTheDocument();
  });

  it("shows the planned income on request", async () => {
    const { user } = renderWithStore(
      <IncomeListCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(tx: Transaction) => void>()} />,
      { state },
    );
    await user.click(screen.getByRole("radio", { name: "Planned (1)" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("finds an income by its note and opens it", async () => {
    const onEdit = vi.fn<(tx: Transaction) => void>();
    const { user } = renderWithStore(<IncomeListCard onAdd={vi.fn<() => void>()} onEdit={onEdit} />, { state });
    await user.type(screen.getByPlaceholderText("Search notes, sources, accounts…"), "bonus");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: /^Bonus/u }));
    expect(onEdit).toHaveBeenCalledWith(state.transactions[1]);
  });

  it("invites to log the first income", () => {
    renderWithStore(<IncomeListCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(tx: Transaction) => void>()} />);
    expect(screen.getByText("No income yet")).toBeInTheDocument();
  });

  it("does not repeat a category that the note only restates", () => {
    renderWithStore(<IncomeListCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(tx: Transaction) => void>()} />, {
      state: {
        ...DEFAULT_STATE,
        transactions: [income({ id: "pay", date: "2026-10-05", amount: 1000, note: "Salary" })],
      },
    });
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.queryByText(/^Salary · /u)).not.toBeInTheDocument();
  });
});
