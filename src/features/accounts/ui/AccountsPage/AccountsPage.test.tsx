import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import AccountsPage from "./AccountsPage";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "black", name: "Black", icon: "💳", kind: "card", currency: "UAH", openingBalance: 1000 }],
  transactions: [
    {
      id: "milk",
      type: "expense",
      amount: 50,
      currency: "UAH",
      categoryId: "cat-groceries",
      date: "2026-10-02",
      accountId: "black",
    },
  ],
  debts: [{ id: "loan", name: "Car loan", icon: "🚗", kind: "loan", currency: "UAH", balance: 5000 }],
  receivables: [{ id: "ann", name: "Ann", icon: "🤝", amount: 300, currency: "UAH", date: "2026-09-01", repaid: 0 }],
};

describe("AccountsPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds debts and loans from their cards once there are some", () => {
    renderWithStore(<AccountsPage />, { state });
    expect(screen.queryByRole("button", { name: "Debt" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lent" })).not.toBeInTheDocument();
  });

  it("opens the sheets for a new account, debt and loan", async () => {
    const { user } = renderWithStore(<AccountsPage />, { state: { ...state, debts: [], receivables: [] } });
    await user.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.getByRole("dialog", { name: "New account" })).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Debt" }));
    expect(screen.getByRole("dialog", { name: "New debt" })).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Lent" }));
    expect(screen.getByRole("dialog", { name: "Money lent" })).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes a debt and a loan once confirmed", async () => {
    const { user, probe } = renderWithStore(<AccountsPage />, { state });
    await user.click(screen.getByRole("button", { name: /^Car loan/u }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Edit debt" })).getByRole("button", { name: "Delete debt" }),
    );
    await user.click(
      within(screen.getByRole("dialog", { name: "Delete this debt?" })).getByRole("button", { name: "Delete" }),
    );
    expect(probe.state.debts).toEqual([]);

    await user.click(screen.getByRole("button", { name: /^Ann/u }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Edit loan" })).getByRole("button", { name: "Delete loan" }),
    );
    const confirm = screen.getByRole("dialog", { name: "Delete this loan?" });
    await user.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(probe.state.receivables).toHaveLength(1);
    vi.setSystemTime(Date.now() + 500);
    await user.click(
      within(screen.getByRole("dialog", { name: "Edit loan" })).getByRole("button", { name: "Delete loan" }),
    );
    await user.click(
      within(screen.getByRole("dialog", { name: "Delete this loan?" })).getByRole("button", { name: "Delete" }),
    );
    expect(probe.state.receivables).toEqual([]);
    expect(probe.undoLabels).toEqual(expect.arrayContaining(["Debt deleted", "Loan deleted"]));
  });

  it("reconciles an account from its sheet", async () => {
    const { user } = renderWithStore(<AccountsPage />, { state });
    await user.click(screen.getByRole("button", { name: /^Black/u }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Edit account" })).getByRole("button", { name: "Reconcile" }),
    );
    const sheet = screen.getByRole("dialog", { name: "Reconcile Black" });
    await user.click(within(sheet).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes an account after warning about its entries", async () => {
    const { user, probe } = renderWithStore(<AccountsPage />, { state });
    await user.click(screen.getByRole("button", { name: /^Black/u }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Edit account" })).getByRole("button", { name: "Delete" }),
    );
    const confirm = screen.getByRole("dialog", { name: "Delete this account?" });
    expect(confirm).toHaveTextContent("1 transaction keeps its amount");
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));
    expect(probe.state.savings).toEqual([]);
    expect(probe.undoLabels).toContain("Account deleted");
  });
});
