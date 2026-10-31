import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HeroTrend from "./HeroTrend";

describe("HeroTrend", () => {
  it("names the trend, labels both ends of the axis and grows into its box", () => {
    const { container } = render(
      <HeroTrend title="Last 12 months" summary="+280.3K ₴" values={[1, 4, 9]} tone="income" from="Oct" to="Sept" />,
    );
    expect(screen.getByRole("figure", { name: "Last 12 months" })).toBeInTheDocument();
    expect(screen.getByText("Oct")).toBeInTheDocument();
    expect(screen.getByText("Sept")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("height", "200");
  });
});
