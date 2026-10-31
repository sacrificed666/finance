import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithI18n } from "@/test/render";

import YearReviewCard from "./YearReviewCard";

describe("YearReviewCard", () => {
  it("shows the best and toughest months", () => {
    renderWithI18n(
      <YearReviewCard
        year={[
          { month: "2026-08", income: 0, expense: 0, net: 0 },
          { month: "2026-09", income: 1000, expense: 1500, net: -500 },
          { month: "2026-10", income: 3000, expense: 1000, net: 2000 },
        ]}
        period="2026"
        currency="UAH"
      />,
    );
    expect(screen.getByText("+2,000 ₴")).toBeInTheDocument();
    expect(screen.getByText("−500 ₴")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 months in the plus")).toBeInTheDocument();
  });
});
