import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Slider from "./Slider";

describe("Slider", () => {
  it("fills the track up to the value and reports changes as numbers", () => {
    const onChange = vi.fn<(value: number) => void>();
    render(<Slider label="Years" min={1} max={41} step={2} value={11} onChange={onChange} />);
    const slider = screen.getByRole("slider", { name: "Years" });
    expect(slider.style.getPropertyValue("--fill")).toBe("25%");
    fireEvent.change(slider, { target: { value: "21" } });
    expect(onChange).toHaveBeenCalledWith(21);
  });

  it("stays empty when the range has no width", () => {
    render(<Slider min={5} max={5} value={5} onChange={vi.fn<(value: number) => void>()} />);
    expect(screen.getByRole("slider").style.getPropertyValue("--fill")).toBe("0%");
  });
});
