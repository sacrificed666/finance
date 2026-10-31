import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import AccountsHero from "./AccountsHero";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [
    { id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 30000 },
    {
      id: "jar",
      name: "Jar",
      icon: "🫙",
      kind: "savings",
      currency: "UAH",
      openingBalance: 5000,
      goal: { target: 10000 },
    },
  ],
  debts: [{ id: "car", name: "Car", icon: "🏦", kind: "loan", currency: "UAH", balance: 7000 }],
};

describe("AccountsHero", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds up the accounts with the goals and the debts", () => {
    renderWithStore(<AccountsHero />, { state });
    expect(screen.getByText("35,000 ₴")).toBeInTheDocument();
    expect(screen.getByText("2 accounts")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("−7,000 ₴")).toBeInTheDocument();
  });

  it("shows a dash for the cushion without spending", () => {
    renderWithStore(<AccountsHero />, { state });
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
