import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { forecast } from "@/features/forecast/model/forecast";
import { renderWithI18n } from "@/test/render";

import ForecastHero from "./ForecastHero";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 30000 }],
  transactions: [
    { id: "pay", type: "income", amount: 20000, currency: "UAH", categoryId: "cat-salary", date: "2026-09-01" },
    { id: "food", type: "expense", amount: 10000, currency: "UAH", categoryId: "cat-groceries", date: "2026-09-02" },
  ],
};

const controls = { years: 2, returnPct: 4, spreadPct: 2, inflationOn: false, withDebts: false, withSaving: true };

describe("ForecastHero", () => {
  it("shows the money at the horizon with its range and the cautious run", () => {
    const f = forecast(state, "2026-10-10", { ...controls, view: "UAH", events: [] });
    renderWithI18n(<ForecastHero f={f} years={2} returnPct={4} spreadPct={2} inflationOn={false} />);
    expect(screen.getByText("In 2 years")).toBeInTheDocument();
    expect(screen.getByText(/^between /u)).toBeInTheDocument();
    expect(screen.getByText("Cautious")).toBeInTheDocument();
    expect(screen.getByText(/2%\/yr$/u)).toBeInTheDocument();
    expect(screen.getByText("after 2028")).toBeInTheDocument();
    expect(screen.getByText(/^4% a year covers \d+% of spending$/u)).toBeInTheDocument();
  });

  it("shows a dash for independence without spending", () => {
    const f = forecast({ ...state, transactions: [] }, "2026-10-10", { ...controls, view: "UAH", events: [] });
    renderWithI18n(<ForecastHero f={f} years={2} returnPct={4} spreadPct={2} inflationOn />);
    expect(screen.getByText("In 2 years (real)")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("record spending to see this")).toBeInTheDocument();
  });

  it("lets the cautious run lose money when the expected return is nothing", () => {
    const f = forecast(state, "2026-10-10", { ...controls, returnPct: 0, view: "UAH", events: [] });
    expect(f.endLow).toBeLessThan(f.endTotal);
    renderWithI18n(<ForecastHero f={f} years={2} returnPct={0} spreadPct={2} inflationOn={false} />);
    expect(screen.getByText(/· −2%\/yr$/u)).toBeInTheDocument();
  });
});
