import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Monogram from "./Monogram";

describe("Monogram", () => {
  it("draws the initials in the brand colour at the given size", () => {
    render(<Monogram name="Sense Bank" color="#e4002b" size={40} />);
    const monogram = screen.getByText("SB");
    expect(monogram).toHaveAttribute("aria-hidden", "true");
    expect(monogram.style.width).toBe("40px");
    expect(monogram.style.fontSize).toBe("15px");
  });
});
