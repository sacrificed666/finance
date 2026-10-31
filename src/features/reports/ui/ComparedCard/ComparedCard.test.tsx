import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithStore } from "@/test/render";

import ComparedCard from "./ComparedCard";

describe("ComparedCard", () => {
  it("says when nothing was spent", () => {
    renderWithStore(<ComparedCard changes={[]} current="October" previous="September" currency="UAH" />);
    expect(screen.getByText("Nothing to compare yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add an expense" })).toHaveAttribute("href", "/transactions");
  });

  it("shows each category's change, a new one and a flat one", () => {
    renderWithStore(
      <ComparedCard
        changes={[
          { id: "cat-food", value: 300, before: 200 },
          { id: "cat-transport", value: 100, before: 0 },
          { id: "cat-health", value: 50, before: 50 },
        ]}
        current="October"
        previous="September"
        currency="UAH"
      />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("+50%");
    expect(rows[1]).toHaveTextContent("new");
    expect(rows[2]).toHaveTextContent("-");
  });
});
