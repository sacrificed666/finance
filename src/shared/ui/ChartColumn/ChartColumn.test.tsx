import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ChartColumn from "./ChartColumn";

// Draws a column in an SVG and returns its path
const draw = (props: Parameters<typeof ChartColumn>[0]) =>
  render(
    <svg>
      <ChartColumn {...props} />
    </svg>,
  ).container.querySelector("path");

describe("ChartColumn", () => {
  it("draws a column with rounded top corners and its place in the order", () => {
    const path = draw({ x: 10, w: 12, y0: 100, y1: 40, color: "red", index: 3 });
    expect(path?.getAttribute("d")).toBe("M10,100 L10,44 Q10,40 14,40 L18,40 Q22,40 22,44 L22,100 Z");
    expect(path).toHaveAttribute("fill", "red");
    expect(path?.style.getPropertyValue("--i")).toBe("3");
  });

  it("can have square corners", () => {
    const path = draw({ x: 0, w: 10, y0: 50, y1: 20, color: "blue", rounded: false });
    expect(path?.getAttribute("d")).toBe("M0,50 L0,20 Q0,20 0,20 L10,20 Q10,20 10,20 L10,50 Z");
  });

  it("leaves out a column too short to see", () => {
    expect(draw({ x: 0, w: 10, y0: 50, y1: 49.8, color: "blue" })).toBeNull();
  });
});
