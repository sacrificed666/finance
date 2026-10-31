import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Investment } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import PricesFootnote from "./PricesFootnote";

// Some bitcoin, priced once or never
const bitcoin = (pricedAt?: string): Investment => ({
  id: "btc",
  name: "Bitcoin",
  kind: "crypto",
  currency: "USD",
  principal: 1000,
  annualRatePct: 0,
  coin: "bitcoin",
  quantity: 0.01,
  pricedAt,
  startDate: "2026-01-10",
  compounding: "reinvest",
  compoundingFreq: "monthly",
});

// The default data holding these investments
const holding = (...investments: Investment[]): AppState => ({ ...DEFAULT_STATE, investments });

describe("PricesFootnote", () => {
  it("tells when the prices were fetched and when they refresh", () => {
    renderWithStore(<PricesFootnote scope="investments" />, { state: holding(bitcoin("2026-10-17T09:00:00Z")) });
    expect(screen.getByText(/^Prices updated/u)).toBeInTheDocument();
    expect(screen.getByText(/^next update at/u)).toBeInTheDocument();
  });

  it("says when nothing was fetched yet", () => {
    renderWithStore(<PricesFootnote scope="investments" />, { state: holding(bitcoin()) });
    expect(screen.getByText("Prices not fetched yet")).toBeInTheDocument();
  });

  it("stays away from pages without priced items", () => {
    const { container } = renderWithStore(<PricesFootnote scope="accounts" />, { state: holding(bitcoin()) });
    expect(container).toBeEmptyDOMElement();
  });
});
