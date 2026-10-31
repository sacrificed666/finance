import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { renderWithStore } from "@/test/render";

import WeekdaysCard from "./WeekdaysCard";

describe("WeekdaysCard", () => {
  it("names the dearest weekday and bars the week from Monday", () => {
    const state = {
      ...DEFAULT_STATE,
      transactions: [
        {
          id: "s",
          type: "expense" as const,
          amount: 1200,
          currency: "UAH" as const,
          categoryId: "cat-food",
          date: "2026-10-24",
        },
      ],
    };
    renderWithStore(<WeekdaysCard today="2026-10-28" />, { state });
    expect(screen.getByText("Most on Saturday: 100 ₴ on average")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(8);
  });

  it("stays away without spending", () => {
    const { container } = renderWithStore(<WeekdaysCard today="2026-10-28" />);
    expect(container).toBeEmptyDOMElement();
  });
});
