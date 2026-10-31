import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { forecast } from "@/features/forecast/model/forecast";
import { renderWithI18n } from "@/test/render";

import YearlyTableCard from "./YearlyTableCard";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 30000 }],
  debts: [{ id: "car", name: "Car", icon: "🚗", kind: "loan", currency: "UAH", balance: 5000 }],
};

describe("YearlyTableCard", () => {
  it("lists a row a year with the debts and what each year added", () => {
    const f = forecast(state, "2026-10-10", {
      years: 2,
      returnPct: 0,
      spreadPct: 0,
      inflationOn: false,
      withDebts: true,
      withSaving: false,
      view: "UAH",
      events: [],
    });
    renderWithI18n(<YearlyTableCard f={f} withDebts />);
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent("Now");
    expect(rows[1]).toHaveTextContent("−5,000 ₴");
    expect(rows[2]).toHaveTextContent("2027");
    expect(screen.getByRole("columnheader", { name: "Debts" })).toBeInTheDocument();
  });
});
