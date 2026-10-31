import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Investment } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import InvestmentsHero from "./InvestmentsHero";

const stocks: Investment = {
  id: "index",
  name: "Index fund",
  kind: "stocks",
  currency: "UAH",
  principal: 10000,
  marketValue: 12000,
  annualRatePct: 0,
  startDate: "2026-01-10",
  compounding: "reinvest",
  compoundingFreq: "annually",
};

const deposit: Investment = {
  id: "deposit",
  name: "Deposit",
  kind: "deposit",
  currency: "UAH",
  principal: 100000,
  annualRatePct: 12,
  startDate: "2026-10-10",
  compounding: "reinvest",
  compoundingFreq: "monthly",
};

describe("InvestmentsHero", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the value, the gain on the money put in and a dash for no projection", () => {
    renderWithStore(<InvestmentsHero />, { state: { ...DEFAULT_STATE, investments: [stocks] } });
    expect(screen.getByText("12,000 ₴")).toBeInTheDocument();
    expect(screen.getByText("20% on what you put in")).toBeInTheDocument();
    expect(screen.getByText("across 1 position")).toBeInTheDocument();
    expect(screen.getByText("+2,000 ₴")).toBeInTheDocument();
    expect(screen.getByText("All of it still at work")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("market holdings are shown at what they are worth, not projected")).toBeInTheDocument();
  });

  it("projects what a deposit earns over the next year", () => {
    const state: AppState = { ...DEFAULT_STATE, investments: [deposit] };
    renderWithStore(<InvestmentsHero />, { state });
    expect(screen.getByText("+12.7K ₴")).toBeInTheDocument();
    expect(screen.getByText("≈ 112.7K ₴ in a year")).toBeInTheDocument();
    expect(screen.queryByText("Next maturity")).not.toBeInTheDocument();
  });

  it("leaves maturities to the schedule card and names the year's earnings apart from the chart", () => {
    const dated = { ...deposit, endDate: "2027-04-10" };
    renderWithStore(<InvestmentsHero />, { state: { ...DEFAULT_STATE, investments: [dated] } });
    expect(screen.queryByText("Next maturity")).not.toBeInTheDocument();
    expect(screen.getByText("Earns in a year")).toBeInTheDocument();
    expect(screen.getAllByText("Next 12 months")).toHaveLength(1);
  });
});
