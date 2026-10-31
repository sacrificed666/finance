import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Investment } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import ScheduleCard from "./ScheduleCard";

// A deposit with the given fields
const deposit = (id: string, over: Partial<Investment>): Investment => ({
  id,
  name: id,
  kind: "deposit",
  currency: "UAH",
  principal: 10000,
  annualRatePct: 10,
  startDate: "2026-01-10",
  compounding: "payout",
  compoundingFreq: "monthly",
  ...over,
});

// The card with spies for its callbacks
const renderCard = (investments: Investment[]) => {
  const spies = {
    onOpen: vi.fn<(inv: Investment) => void>(),
    onRenew: vi.fn<(inv: Investment) => void>(),
    onClose: vi.fn<(inv: Investment) => void>(),
  };
  const state: AppState = { ...DEFAULT_STATE, investments };
  return { ...spies, ...renderWithStore(<ScheduleCard {...spies} />, { state }) };
};

describe("ScheduleCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows nothing without top-ups, payouts or terms", () => {
    const { container } = renderCard([deposit("Plain", { compounding: "reinvest" })]);
    expect(container).toBeEmptyDOMElement();
  });

  it("adds up the monthly top-ups and the payouts of the year", () => {
    renderCard([deposit("Paying", { monthlyContribution: 1000 })]);
    expect(screen.getByText("Top-ups")).toBeInTheDocument();
    expect(screen.getByText("12K ₴ a year")).toBeInTheDocument();
    expect(screen.getByText("Payouts")).toBeInTheDocument();
  });

  it("offers to reinvest or withdraw a term that has ended", async () => {
    const { user, onRenew, onClose } = renderCard([deposit("Ended", { endDate: "2026-09-01" })]);
    expect(screen.getByText("Term ended")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reinvest" }));
    await user.click(screen.getByRole("button", { name: "Withdraw" }));
    expect(onRenew).toHaveBeenCalledWith(expect.objectContaining({ id: "Ended" }));
    expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ id: "Ended" }));
  });

  it("lists the terms ending soonest first and opens one", async () => {
    const later = deposit("Later", { endDate: "2027-06-10" });
    const sooner = deposit("Sooner", { endDate: "2026-12-10" });
    const { user, onOpen } = renderCard([later, sooner]);
    const rows = screen.getAllByRole("button", { name: /^(Sooner|Later)/u });
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("in 2 months"),
      expect.stringContaining("in 8 months"),
    ]);
    await user.click(screen.getByRole("button", { name: /^Sooner/u }));
    expect(onOpen).toHaveBeenCalledWith(sooner);
  });
});
