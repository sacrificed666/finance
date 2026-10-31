import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithStore } from "@/test/render";

import LargestCard from "./LargestCard";

describe("LargestCard", () => {
  it("names a spending by its note or its category", () => {
    renderWithStore(
      <LargestCard
        largest={[
          {
            tx: {
              id: "a",
              type: "expense",
              amount: 900,
              currency: "UAH",
              categoryId: "cat-rent",
              date: "2026-10-01",
              note: "October rent",
            },
            base: 900,
          },
          {
            tx: {
              id: "b",
              type: "expense",
              amount: 300,
              currency: "UAH",
              categoryId: "cat-groceries",
              date: "2026-10-02",
            },
            base: 300,
          },
        ]}
        period="October"
      />,
    );
    expect(screen.getByText("October rent")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("−900 ₴")).toBeInTheDocument();
  });
});
