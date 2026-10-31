import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { forecast, type ForecastControls } from "@/features/forecast/model/forecast";
import { renderWithI18n } from "@/test/render";

import AssumptionsCard from "./AssumptionsCard";

const controls: ForecastControls = {
  years: 10,
  returnPct: 5,
  spreadPct: 3,
  inflationOn: false,
  withDebts: true,
  withSaving: true,
};

// The card over a state, with a spy for its changes
const renderCard = (state: AppState) => {
  const onChange = vi.fn<(fields: Partial<ForecastControls>) => void>();
  const f = forecast(state, "2026-10-10", { ...controls, view: "UAH", events: [] });
  return { onChange, ...renderWithI18n(<AssumptionsCard f={f} controls={controls} onChange={onChange} />) };
};

describe("AssumptionsCard", () => {
  it("shows the chosen horizon and return and turns the switches", async () => {
    const { user, onChange } = renderCard(DEFAULT_STATE);
    expect(screen.getByText("10 years")).toBeInTheDocument();
    expect(screen.getByText("5%/yr")).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Subtract debts" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Show in today’s money" }));
    expect(onChange).toHaveBeenCalledWith({ inflationOn: true });
  });

  it("offers to subtract debts when there are some", async () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      debts: [{ id: "car", name: "Car", icon: "🚗", kind: "loan", currency: "UAH", balance: 1000 }],
    };
    const { user, onChange } = renderCard(state);
    await user.click(screen.getByRole("switch", { name: "Subtract debts" }));
    expect(onChange).toHaveBeenCalledWith({ withDebts: false });
  });
});
