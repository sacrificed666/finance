import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BarRow from "./BarRow";

describe("BarRow", () => {
  it("draws a column a value, hangs a negative one and lists them for screen readers", () => {
    const { container } = render(
      <BarRow
        caption="Kept"
        columns={["Month", "Rate"]}
        bars={[
          { key: "a", label: "May", value: 40, display: "40%", strong: true },
          { key: "b", label: "Jun", value: -20, display: "−20%" },
        ]}
      />,
    );
    expect(screen.getByRole("table", { name: "Kept" })).toBeInTheDocument();
    const bars = container.querySelectorAll("[class*=bar]");
    expect(bars[0]?.className).toMatch(/income/u);
    expect(bars[1]?.className).toMatch(/below/u);
    expect(bars[1]?.className).toMatch(/quiet/u);
  });
});
