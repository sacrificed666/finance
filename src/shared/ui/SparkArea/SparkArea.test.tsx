import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SparkArea from "./SparkArea";

describe("SparkArea", () => {
  it("fills its measured width with a line over a fading area", () => {
    const { container } = render(<SparkArea values={[2, 6, 4]} tone="income" height={40} />);
    const paths = container.querySelectorAll("path");
    expect(container.querySelector("svg")).toHaveAttribute("width", "320");
    expect(paths[1]?.getAttribute("d")).toBe("M0.0,37.0L160.0,5.0L320.0,21.0");
    expect(paths[0]?.getAttribute("d")).toBe("M0.0,37.0L160.0,5.0L320.0,21.0L320,40L0,40Z");
    expect(paths[1]).toHaveAttribute("stroke", "var(--color-income)");
  });

  it("draws nothing for a single value", () => {
    const { container } = render(<SparkArea values={[2]} tone="accent" height={40} />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
