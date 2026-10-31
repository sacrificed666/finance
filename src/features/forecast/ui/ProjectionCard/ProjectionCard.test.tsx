import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { forecast } from "@/features/forecast/model/forecast";
import { renderWithI18n } from "@/test/render";

import ProjectionCard from "./ProjectionCard";

describe("ProjectionCard", () => {
  it("names the currency and explains the assumptions under the chart", () => {
    const f = forecast(DEFAULT_STATE, "2026-10-10", {
      years: 5,
      returnPct: 6,
      spreadPct: 0,
      inflationOn: true,
      withDebts: false,
      withSaving: false,
      view: "USD",
      events: [],
    });
    renderWithI18n(<ProjectionCard f={f} years={5} returnPct={6} inflationOn withDebts={false} />);
    expect(screen.getByText("Wealth projection · USD")).toBeInTheDocument();
    expect(screen.getByText(/^Savings compound at 6%\/yr.*today’s purchasing power\.$/u)).toBeInTheDocument();
  });
});
