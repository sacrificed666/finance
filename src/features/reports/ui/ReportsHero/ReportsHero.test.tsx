import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { report } from "@/features/reports/model/report";
import { renderWithStore } from "@/test/render";

import ReportsHero from "./ReportsHero";

describe("ReportsHero", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("leaves the figures out of a period with nothing in it", () => {
    const r = report(DEFAULT_STATE, "month", "2026-12");
    renderWithStore(<ReportsHero r={r} previous="November 2026" action={null} />);
    expect(screen.getByRole("heading", { name: "Net" })).toBeInTheDocument();
    expect(screen.queryByText("Savings rate")).not.toBeInTheDocument();
    expect(screen.queryByText("-")).not.toBeInTheDocument();
  });

  it("sets the period beside the net of the months before it", () => {
    const state = {
      ...DEFAULT_STATE,
      transactions: [
        {
          id: "a",
          type: "income" as const,
          amount: 3000,
          currency: "UAH" as const,
          categoryId: "cat-salary",
          date: "2026-08-05",
        },
        {
          id: "b",
          type: "expense" as const,
          amount: 1000,
          currency: "UAH" as const,
          categoryId: "cat-rent",
          date: "2026-09-05",
        },
      ],
    };
    renderWithStore(<ReportsHero r={report(state, "month", "2026-10")} previous="September 2026" action={null} />, {
      state,
    });
    expect(screen.getByText("Last 3 months")).toBeInTheDocument();
    expect(screen.getByText("+667 ₴/mo on average")).toBeInTheDocument();
  });
});
