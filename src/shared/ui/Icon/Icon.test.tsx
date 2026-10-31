import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Icon from "./Icon";
import { ICON_PATHS, SUBJECT_SLOT } from "./icons";

describe("Icon", () => {
  it("draws every path of the icon, hidden from screen readers", () => {
    const { container } = render(<Icon name="wallet" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "18");
    expect(container.querySelectorAll("path")).toHaveLength(ICON_PATHS.wallet.length);
  });

  it("takes a size, a stroke width and extra classes", () => {
    const { container } = render(<Icon name="plus" size={14} strokeWidth={2.4} className="extra" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "14");
    expect(svg).toHaveAttribute("stroke-width", "2.4");
    expect(svg).toHaveClass("extra");
  });

  it("gives subjects a colour slot within the series palette", () => {
    for (const slot of Object.values(SUBJECT_SLOT)) {
      expect(slot).toBeGreaterThanOrEqual(1);
      expect(slot).toBeLessThanOrEqual(14);
    }
  });
});
