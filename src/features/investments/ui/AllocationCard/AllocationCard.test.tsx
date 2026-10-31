import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Investment } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import AllocationCard from "./AllocationCard";

// A market position worth what was paid for it
const position = (id: string, over: Partial<Investment>): Investment => ({
  id,
  name: id,
  kind: "stocks",
  currency: "UAH",
  principal: 1000,
  annualRatePct: 0,
  startDate: "2026-01-01",
  compounding: "reinvest",
  compoundingFreq: "annually",
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, rates: { USD: 40, EUR: 45 } },
  investments: [
    position("shares", { principal: 6000 }),
    position("coins", { kind: "crypto", currency: "USD", principal: 100 }),
  ],
};

describe("AllocationCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("splits the positions by kind", () => {
    renderWithStore(<AllocationCard />, { state });
    expect(screen.getByText("Stocks")).toBeInTheDocument();
    expect(screen.getByText("Cryptocurrency")).toBeInTheDocument();
  });

  it("shows each currency's share when there are several", () => {
    renderWithStore(<AllocationCard />, { state });
    expect(screen.getByText((_, element) => element?.textContent === "UAH 60%")).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === "USD 40%")).toBeInTheDocument();
  });

  it("stays away with one kind in one currency", () => {
    const { container } = renderWithStore(<AllocationCard />, {
      state: { ...state, investments: state.investments.slice(0, 1) },
    });
    expect(container).toBeEmptyDOMElement();
  });
});
