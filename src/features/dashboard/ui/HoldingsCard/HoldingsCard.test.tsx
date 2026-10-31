import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import HoldingsCard from "./HoldingsCard";

const state: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, rates: { USD: 40, EUR: 45 } },
  savings: [
    { id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 6000 },
    { id: "cash", name: "Dollars", icon: "💵", kind: "cash", currency: "USD", openingBalance: 100 },
  ],
};

describe("HoldingsCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invites to add an account when nothing is held", () => {
    renderWithStore(<HoldingsCard />);
    expect(screen.getByRole("link", { name: "Add accounts" })).toHaveAttribute("href", "/accounts");
  });

  it("splits the net worth by holding and links to the accounts and investments", () => {
    renderWithStore(<HoldingsCard />, { state });
    expect(screen.getByText("Card")).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Accounts/u })).toHaveAttribute("href", "/accounts");
    expect(screen.getByRole("link", { name: /^Investments/u })).toHaveAttribute("href", "/investments");
  });

  it("switches to the split by currency with today's rates, and remembers it", async () => {
    const { user } = renderWithStore(<HoldingsCard />, { state });
    await user.click(screen.getByRole("radio", { name: "Currencies" }));
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
    expect(screen.getByText(/1 \$ = 40 ₴/u)).toBeInTheDocument();
    expect(localStorage.getItem("finance:view:dash.allocation")).toBe(JSON.stringify("currencies"));
  });

  it("offers no split by currency while everything is in one", () => {
    renderWithStore(<HoldingsCard />, { state: { ...state, savings: state.savings.slice(0, 1) } });
    expect(screen.queryByRole("radio", { name: "Currencies" })).not.toBeInTheDocument();
  });
});
