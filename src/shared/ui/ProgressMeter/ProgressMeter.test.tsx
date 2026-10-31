import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ProgressMeter from "./ProgressMeter";

// The fill of the only meter on the page
const fill = () => screen.getByRole("meter").previousElementSibling;

describe("ProgressMeter", () => {
  it("reports its share as a percentage and fills that far", () => {
    render(<ProgressMeter value={30} max={120} label="Saved" />);
    const meter = screen.getByRole("meter", { name: "Saved" });
    expect(meter).toHaveAttribute("value", "25");
    expect(fill()).toHaveStyle({ width: "25%" });
    expect(fill()?.className).toMatch(/fine/u);
  });

  it("stays full past the maximum and empty without one", () => {
    const { rerender } = render(<ProgressMeter value={200} max={100} />);
    expect(fill()).toHaveStyle({ width: "100%" });
    rerender(<ProgressMeter value={5} max={0} />);
    expect(fill()).toHaveStyle({ width: "0%" });
  });

  it("turns a budget amber close to its limit and red past it", () => {
    const { rerender } = render(<ProgressMeter value={90} max={100} tone="budget" />);
    expect(fill()?.className).toMatch(/close/u);
    rerender(<ProgressMeter value={120} max={100} tone="budget" />);
    expect(fill()?.className).toMatch(/over/u);
    rerender(<ProgressMeter value={10} max={100} tone="budget" />);
    expect(fill()?.className).toMatch(/fine/u);
  });
});
