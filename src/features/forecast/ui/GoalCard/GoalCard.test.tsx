import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { forecast } from "@/features/forecast/model/forecast";
import { renderWithI18n } from "@/test/render";

import GoalCard from "./GoalCard";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 30000 }],
  transactions: [
    { id: "pay", type: "income", amount: 20000, currency: "UAH", categoryId: "cat-salary", date: "2026-09-01" },
    { id: "food", type: "expense", amount: 10000, currency: "UAH", categoryId: "cat-groceries", date: "2026-09-02" },
  ],
};

const f = forecast(state, "2026-10-10", {
  years: 2,
  returnPct: 0,
  spreadPct: 0,
  inflationOn: false,
  withDebts: false,
  withSaving: true,
  view: "UAH",
  events: [],
});

describe("GoalCard", () => {
  it("waits for a target, then says when it is reached", async () => {
    const { user } = renderWithI18n(<GoalCard f={f} years={2} returnPct={0} />);
    expect(screen.queryByText("Reached around")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Target amount/u), "100000");
    expect(screen.getByText("Reached around")).toBeInTheDocument();
    expect(screen.getByText("in 7 months")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("fills a preset and says when the money is there already", async () => {
    const { user } = renderWithI18n(<GoalCard f={f} years={2} returnPct={0} />);
    await user.click(screen.getByRole("button", { name: "20K\u00A0₴" }));
    expect(screen.getByText("You’re already there")).toBeInTheDocument();
  });

  it("says when a target is out of reach", async () => {
    const { user } = renderWithI18n(<GoalCard f={f} years={2} returnPct={0} />);
    await user.type(screen.getByLabelText(/^Target amount/u), "10000000");
    expect(screen.getByText("Not within 2 years")).toBeInTheDocument();
    expect(screen.getByText(/^Put aside /u)).toBeInTheDocument();
  });
});
