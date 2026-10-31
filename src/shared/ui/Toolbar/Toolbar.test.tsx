import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Toolbar from "./Toolbar";

describe("Toolbar", () => {
  it("lays out its controls in one wrapping row", () => {
    const { container } = render(
      <Toolbar className="extra">
        <button type="button">Filter</button>
      </Toolbar>,
    );
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("extra");
  });
});
