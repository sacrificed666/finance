import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Investment } from "@/features/data/model/types";
import { renderWithI18n } from "@/test/render";

import PositionCard from "./PositionCard";

const deposit: Investment = {
  id: "deposit",
  name: "Savings deposit",
  kind: "deposit",
  currency: "UAH",
  principal: 100000,
  annualRatePct: 12,
  startDate: "2026-10-10",
  compounding: "reinvest",
  compoundingFreq: "monthly",
};

const fund: Investment = {
  id: "reit",
  name: "My REIT",
  kind: "inzhur",
  fund: "inzhur-reit",
  currency: "UAH",
  principal: 12000,
  marketValue: 15000,
  quantity: 100,
  annualRatePct: 9.5,
  startDate: "2026-01-10",
  compounding: "payout",
  compoundingFreq: "monthly",
  note: "Bought on the dip",
};

// The card of a position on 10 October 2026
const renderCard = (inv: Investment) => {
  const onEdit = vi.fn<() => void>();
  return {
    onEdit,
    ...renderWithI18n(<PositionCard inv={inv} today="2026-10-10" yearOut="2027-10-10" onEdit={onEdit} />),
  };
};

describe("PositionCard", () => {
  it("shows a deposit's terms and what it adds in a year", async () => {
    const { user, onEdit } = renderCard(deposit);
    expect(screen.getByRole("heading", { name: "Savings deposit" })).toBeInTheDocument();
    expect(screen.getByText("Deposit · UAH")).toBeInTheDocument();
    expect(screen.getByText("12%/yr")).toBeInTheDocument();
    expect(screen.getByText("Compound · monthly")).toBeInTheDocument();
    expect(screen.getByText("(+12,673 ₴ earned)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("shows a fund's certificates, price and forecast", () => {
    renderCard(fund);
    expect(screen.getByText("Inzhur · Inzhur REIT · UAH")).toBeInTheDocument();
    expect(screen.getByText("9.5%/yr · USD")).toBeInTheDocument();
    expect(screen.getByText("Monthly dividends")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("150.00 ₴")).toBeInTheDocument();
    expect(screen.getByText("Bought on the dip")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("turns the trend arrow down for a loss", () => {
    const { container } = renderCard({ ...fund, marketValue: 9000 });
    expect(container.querySelector("[class*=flipped]")).not.toBeNull();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });
});
