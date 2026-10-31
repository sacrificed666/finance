import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { renderWithStore } from "@/test/render";

import IncomeByMonthCard from "./IncomeByMonthCard";

describe("IncomeByMonthCard", () => {
  it("stays away until there is income", () => {
    const { container } = renderWithStore(<IncomeByMonthCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("charts the months once there is income", () => {
    const state = {
      ...DEFAULT_STATE,
      transactions: [
        {
          id: "a",
          type: "income" as const,
          amount: 100,
          currency: "UAH" as const,
          categoryId: "cat-salary",
          date: "2026-01-05",
        },
      ],
    };
    renderWithStore(<IncomeByMonthCard />, { state });
    expect(screen.queryByText("No income recorded yet")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Income by month" })).toBeInTheDocument();
  });
});
