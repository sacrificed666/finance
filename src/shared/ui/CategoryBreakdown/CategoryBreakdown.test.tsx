import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithI18n } from "@/test/render";

import CategoryBreakdown from "./CategoryBreakdown";

const SEGMENTS = [
  { id: "rent", label: "Housing", icon: "🏠", value: 60, colorSlot: 1 },
  { id: "food", label: "Food", icon: "🍽️", value: 30, colorSlot: 3 },
  { id: "taxi", label: "Transport", icon: "🚗", value: 10, colorSlot: 2 },
];

describe("CategoryBreakdown", () => {
  it("lists the parts with their shares and amounts", () => {
    renderWithI18n(<CategoryBreakdown segments={SEGMENTS} currency="UAH" rowExtra={(id) => <i>{`extra ${id}`}</i>} />);
    expect(screen.getByRole("figure", { name: "Breakdown by category" })).toBeInTheDocument();
    expect(screen.getByText("Housing")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("extra food")).toBeInTheDocument();
  });

  it("gathers the parts past the limit into a grey Other", () => {
    renderWithI18n(<CategoryBreakdown segments={SEGMENTS} currency="UAH" maxSegments={1} />);
    expect(screen.getByText("Other")).toBeInTheDocument();
    expect(screen.getAllByText("40%")).toHaveLength(1);
  });

  it("shows nothing for an empty total", () => {
    const { container } = renderWithI18n(<CategoryBreakdown segments={[]} currency="UAH" />);
    expect(container.firstChild).toBeNull();
  });
});
