import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { report } from "@/features/reports/model/report";
import { renderWithStore } from "@/test/render";

import TrendsCard from "./TrendsCard";

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    { id: "a", type: "expense", amount: 300, currency: "UAH", categoryId: "cat-groceries", date: "2026-10-05" },
    { id: "b", type: "expense", amount: 100, currency: "UAH", categoryId: "cat-groceries", date: "2026-09-05" },
  ],
};

describe("TrendsCard", () => {
  it("compares the last month of a category with the months before it", () => {
    const r = report(state, "month", "2026-10");
    renderWithStore(<TrendsCard r={r} spent={[{ id: "cat-food", value: 300, before: 100 }]} currency="UAH" />, {
      state,
    });
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("+200 ₴ vs average")).toBeInTheDocument();
  });

  it("calls a category new without earlier spending and level at the average", () => {
    const steady: AppState = {
      ...state,
      transactions: [
        ...state.transactions,
        { id: "c", type: "expense", amount: 50, currency: "UAH", categoryId: "cat-rent", date: "2026-10-01" },
        { id: "d", type: "expense", amount: 500, currency: "UAH", categoryId: "cat-groceries", date: "2026-08-05" },
        { id: "e", type: "expense", amount: 300, currency: "UAH", categoryId: "cat-groceries", date: "2026-07-05" },
      ],
    };
    const r = report(steady, "month", "2026-10");
    renderWithStore(
      <TrendsCard
        r={r}
        spent={[
          { id: "cat-food", value: 300, before: 100 },
          { id: "cat-housing", value: 50, before: 0 },
        ]}
        currency="UAH"
      />,
      { state: steady },
    );
    expect(screen.getByText("right at the average")).toBeInTheDocument();
    expect(screen.getByText("new")).toBeInTheDocument();
  });
});
