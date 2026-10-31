import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, SavingsAccount } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import CurrenciesCard from "./CurrenciesCard";

// A card account in a currency
const account = (id: string, currency: SavingsAccount["currency"], balance: number): SavingsAccount => ({
  id,
  name: id,
  icon: "💳",
  kind: "card",
  currency,
  openingBalance: balance,
});

describe("CurrenciesCard", () => {
  it("splits the money by currency with the foreign amounts under them", () => {
    const state: AppState = { ...DEFAULT_STATE, savings: [account("uah", "UAH", 4000), account("usd", "USD", 100)] };
    renderWithStore(<CurrenciesCard />, { state });
    expect(screen.getByRole("heading", { name: "By currency" })).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  it("stays away with one currency", () => {
    const state: AppState = { ...DEFAULT_STATE, savings: [account("uah", "UAH", 4000)] };
    const { container } = renderWithStore(<CurrenciesCard />, { state });
    expect(container).toBeEmptyDOMElement();
  });
});
