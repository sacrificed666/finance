import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Logo from "./Logo";

describe("Logo", () => {
  it("draws a decorative hryvnia sign whose gradients never clash with another copy", () => {
    const { container } = render(
      <>
        <Logo />
        <Logo size={52} className="big" />
      </>,
    );
    const [first, second] = container.querySelectorAll("svg");
    expect(first).toHaveAttribute("aria-hidden", "true");
    expect(first).toHaveAttribute("width", "36");
    expect(first?.querySelector("path")?.getAttribute("d")).toMatch(/^M/u);
    expect(second).toHaveAttribute("width", "52");
    expect(second).toHaveClass("big");
    const ids = [...container.querySelectorAll("linearGradient")].map((gradient) => gradient.id);
    expect(new Set(ids).size).toBe(4);
    expect(first?.querySelector("circle")?.getAttribute("fill")).toBe(`url(#${ids[0] ?? ""})`);
  });
});
