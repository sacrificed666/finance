import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import TaxLimitCard from "./TaxLimitCard";

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    {
      id: "big",
      type: "income",
      amount: 8_500_000,
      currency: "UAH",
      categoryId: "cat-salary",
      date: "2026-09-05",
      tax: { ratePct: 6, fixedUAH: 0, gross: 9_500_000, regime: "fop3" },
    },
  ],
};

describe("TaxLimitCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("warns when the limit is nearly used", () => {
    renderWithStore(<TaxLimitCard />, { state });
    expect(screen.getByRole("heading", { name: "2026 income limit" })).toBeInTheDocument();
    expect(screen.getByText("FOP 3 · 5%")).toBeInTheDocument();
    expect(screen.getByText(/left/u).className).toMatch(/near/u);
  });

  it("stays away without taxed income", () => {
    const { container } = renderWithStore(<TaxLimitCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
