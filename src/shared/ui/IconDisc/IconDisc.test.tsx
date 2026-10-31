import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import IconDisc from "./IconDisc";

describe("IconDisc", () => {
  it("tints itself with a series colour", () => {
    const { container } = render(<IconDisc colorSlot={3}>🏦</IconDisc>);
    const disc = container.firstElementChild;
    expect(disc).toHaveAttribute("aria-hidden", "true");
    expect(disc?.getAttribute("style")).toContain("--series-3");
    expect(disc?.className).not.toMatch(/glass/u);
  });

  it("falls back to glass without a colour and takes extra classes", () => {
    const { container } = render(<IconDisc className="extra">💳</IconDisc>);
    const disc = container.firstElementChild;
    expect(disc?.className).toMatch(/glass/u);
    expect(disc).toHaveClass("extra");
    expect(disc?.getAttribute("style")).toBeNull();
  });

  it("takes a size", () => {
    const { container } = render(<IconDisc size="lg">🏦</IconDisc>);
    const disc = container.firstElementChild;
    expect(disc?.className).toMatch(/lg/u);
  });
});
