import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SubjectMark from "./SubjectMark";

describe("SubjectMark", () => {
  it("tints a subject's disc and leaves an icon without one in glass", () => {
    const { container, rerender } = render(<SubjectMark icon="wallet" />);
    const disc = container.firstElementChild;
    expect(disc).toHaveAttribute("aria-hidden");
    expect(disc?.getAttribute("style")).toMatch(/--series-8/u);
    rerender(<SubjectMark icon="home" />);
    expect(container.firstElementChild?.className).toMatch(/plain/u);
  });
});
