import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Investment } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import InvestmentsCard from "./InvestmentsCard";

// A market position worth what it says
const position = (id: string, over: Partial<Investment>): Investment => ({
  id,
  name: id,
  kind: "stocks",
  currency: "UAH",
  principal: 1000,
  annualRatePct: 0,
  startDate: "2026-01-10",
  compounding: "reinvest",
  compoundingFreq: "annually",
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  investments: [
    position("Alpha", { principal: 3000 }),
    position("Bravo", { principal: 5000, marketValue: 4000 }),
    position("Coins", { kind: "crypto", principal: 2000, marketValue: 6000 }),
    position("Delta", { kind: "deposit", principal: 1000, annualRatePct: 10, compoundingFreq: "monthly" }),
  ],
};

// The names of the shown positions, in their order
const names = () => screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);

// The card with spies for its callbacks
const renderCard = () => {
  const onAdd = vi.fn<() => void>();
  const onEdit = vi.fn<(inv: Investment) => void>();
  return { onAdd, onEdit, ...renderWithStore(<InvestmentsCard onAdd={onAdd} onEdit={onEdit} />, { state }) };
};

describe("InvestmentsCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the positions by value and filters them by kind", async () => {
    const { user } = renderCard();
    expect(names()).toEqual(["Coins", "Bravo", "Alpha", "Delta"]);
    await user.click(screen.getByRole("radio", { name: /Cryptocurrency/u }));
    expect(names()).toEqual(["Coins"]);
  });

  it("searches the positions and says when none match", async () => {
    const { user } = renderCard();
    await user.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("Nothing matches")).toBeInTheDocument();
  });

  it("switches to the table and opens a position from it", async () => {
    const { user, onEdit } = renderCard();
    await user.click(screen.getByRole("radio", { name: "Table" }));
    expect(screen.getByRole("table")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Alpha/u }));
    expect(onEdit).toHaveBeenCalledWith(state.investments[0]);
  });
});
