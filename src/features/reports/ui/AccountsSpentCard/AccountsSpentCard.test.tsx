import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { report } from "@/features/reports/model/report";
import { renderWithStore } from "@/test/render";

import AccountsSpentCard from "./AccountsSpentCard";

// An expense in hryvnias in October, from an account or none
const spent = (id: string, amount: number, accountId?: string): Transaction => ({
  id,
  type: "expense",
  amount,
  currency: "UAH",
  categoryId: "cat-groceries",
  date: "2026-10-05",
  accountId,
});

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [
    { id: "card", name: "Black card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 0 },
    { id: "cash", name: "Wallet", icon: "💵", kind: "cash", currency: "UAH", openingBalance: 0 },
  ],
  transactions: [spent("a", 600, "card"), spent("b", 300, "cash"), spent("c", 100)],
};

describe("AccountsSpentCard", () => {
  it("splits the period's spending by the account that paid, the unassigned apart", () => {
    const r = report(state, "month", "2026-10");
    expect([...r.current.byAccount]).toEqual([
      ["card", 600],
      ["cash", 300],
      ["", 100],
    ]);
    renderWithStore(<AccountsSpentCard byAccount={r.current.byAccount} period="October 2026" currency="UAH" />, {
      state,
    });
    expect(screen.getByRole("heading", { name: "Spent by account" })).toBeInTheDocument();
    expect(screen.getByText("Black card")).toBeInTheDocument();
    expect(screen.getByText("Not assigned")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("stays away while one account paid for everything", () => {
    const one = { ...state, transactions: [spent("a", 600, "card")] };
    const r = report(one, "month", "2026-10");
    const { container } = renderWithStore(
      <AccountsSpentCard byAccount={r.current.byAccount} period="October 2026" currency="UAH" />,
      { state: one },
    );
    expect(container).toBeEmptyDOMElement();
  });
});
