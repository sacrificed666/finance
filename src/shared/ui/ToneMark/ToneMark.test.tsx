import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ToneMark from "./ToneMark";

describe("ToneMark", () => {
  it("shows a page's icon on its colour, small by default and large beside a title", () => {
    const { container } = render(
      <>
        <ToneMark icon="home" tone="dashboard" />
        <ToneMark icon="gear" tone="settings" size="lg" className="extra" />
      </>,
    );
    const [small, large] = container.querySelectorAll("span");
    expect(small).toHaveAttribute("aria-hidden", "true");
    expect(small).toHaveAttribute("data-tone", "dashboard");
    expect(small?.className).toMatch(/sm/u);
    expect(large).toHaveAttribute("data-tone", "settings");
    expect(large?.className).toMatch(/lg/u);
    expect(large).toHaveClass("extra");
    expect(large?.querySelector("svg")).toHaveAttribute("width", "24");
  });
});
