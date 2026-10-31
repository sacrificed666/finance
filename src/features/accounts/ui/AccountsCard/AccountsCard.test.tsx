import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, SavingsAccount } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import AccountsCard from "./AccountsCard";

// An account with the given fields
const account = (over: Partial<SavingsAccount> & Pick<SavingsAccount, "id" | "name">): SavingsAccount => ({
  icon: "💳",
  kind: "card",
  currency: "UAH",
  openingBalance: 0,
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [
    account({ id: "black", name: "Black", openingBalance: 3000 }),
    account({ id: "cash", name: "Cash", kind: "cash", openingBalance: 1000 }),
    account({ id: "jar", name: "Jar", kind: "savings", openingBalance: 500, goal: { target: 1000 } }),
    account({ id: "old", name: "Old card", openingBalance: 0 }),
  ],
};

// The names of the listed accounts, in their order
const names = () =>
  screen.getAllByRole("button", { name: /UAH/u }).map((row) => row.querySelector("[class*=name]")?.textContent);

describe("AccountsCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the accounts by balance and folds the empty ones", async () => {
    const { user } = renderWithStore(
      <AccountsCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(account: SavingsAccount) => void>()} />,
      { state },
    );
    expect(names()).toEqual(["Black", "Cash", "Jar"]);
    expect(screen.getByText("goal 1,000 ₴")).toBeInTheDocument();
    expect(screen.queryByText(/^50%/u)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show 1 empty account" }));
    expect(names()).toContain("Old card");
  });

  it("keeps archived accounts behind their own button, marked", async () => {
    const archived: AppState = {
      ...state,
      savings: [...state.savings, account({ id: "gone", name: "Gone", archived: true, openingBalance: 0 })],
    };
    const { user } = renderWithStore(
      <AccountsCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(account: SavingsAccount) => void>()} />,
      { state: archived },
    );
    expect(names()).not.toContain("Gone");
    expect(screen.getByRole("button", { name: "Show 1 empty account" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show 1 archived account" }));
    expect(names()).toContain("Gone");
    expect(screen.getByText(/^Archived · /u)).toBeInTheDocument();
  });

  it("filters by kind and totals what is shown", async () => {
    const { user } = renderWithStore(
      <AccountsCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(account: SavingsAccount) => void>()} />,
      { state },
    );
    await user.click(screen.getByRole("radio", { name: /Cash/u }));
    expect(names()).toEqual(["Cash"]);
    expect(screen.getAllByText("Shown accounts").length).toBeGreaterThan(0);
  });

  it("invites to add the first account", () => {
    renderWithStore(<AccountsCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(account: SavingsAccount) => void>()} />);
    expect(screen.getByText("No accounts yet")).toBeInTheDocument();
  });
});
