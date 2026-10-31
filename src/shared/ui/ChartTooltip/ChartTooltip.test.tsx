import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ChartTooltip from "./ChartTooltip";

describe("ChartTooltip", () => {
  it("sits to the right of the pointer", () => {
    render(
      <ChartTooltip x={40} y={30} containerWidth={400}>
        March
      </ChartTooltip>,
    );
    const tooltip = screen.getByText("March");
    expect(tooltip.style.left).toBe("50px");
    expect(tooltip.style.top).toBe("24px");
  });

  it("switches to the left near the right edge and stays below the top", () => {
    render(
      <ChartTooltip x={380} y={2} containerWidth={400}>
        April
      </ChartTooltip>,
    );
    const tooltip = screen.getByText("April");
    expect(tooltip.style.right).toBe("30px");
    expect(tooltip.style.left).toBe("");
    expect(tooltip.style.top).toBe("0px");
  });
});
