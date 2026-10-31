import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Investment } from "@/features/data/model/types";

import PositionMark from "./PositionMark";

// A position with the given fields
const position = (over: Partial<Investment>): Investment => ({
  id: "p",
  name: "Position",
  kind: "deposit",
  currency: "UAH",
  principal: 1000,
  annualRatePct: 10,
  startDate: "2026-01-01",
  compounding: "reinvest",
  compoundingFreq: "monthly",
  ...over,
});

describe("PositionMark", () => {
  it("shows the emoji of a plain deposit", () => {
    render(<PositionMark inv={position({})} />);
    expect(screen.getByText("🏦")).toBeInTheDocument();
  });

  it("shows the Inzhur logo with the fund's name", () => {
    render(<PositionMark inv={position({ kind: "inzhur", fund: "inzhur-reit" })} />);
    expect(screen.getByRole("img", { name: "Inzhur REIT" })).toHaveAttribute("src", "/brands/inzhur.png");
  });

  it("shows a coin's picture for crypto", () => {
    const { container } = render(<PositionMark inv={position({ kind: "crypto", coinIcon: "btc.png" })} />);
    expect(container.querySelector("img")).toHaveAttribute("src", "btc.png");
  });
});
