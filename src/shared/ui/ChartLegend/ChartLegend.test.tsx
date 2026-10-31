import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ChartLegend from "./ChartLegend";

describe("ChartLegend", () => {
  it("names each series beside its colour, as a line or a square", () => {
    const { container } = render(
      <ChartLegend
        items={[
          { label: "September", color: "var(--color-accent)", kind: "line" },
          { label: "Income", color: "var(--color-income)" },
        ]}
      />,
    );
    expect(screen.getByText("September")).toBeInTheDocument();
    const swatches = container.querySelectorAll("span[aria-hidden]");
    expect(swatches[0]?.className).toMatch(/line/u);
    expect(swatches[1]?.className).toMatch(/rect/u);
  });
});
