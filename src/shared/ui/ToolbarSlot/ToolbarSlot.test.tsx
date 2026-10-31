import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ToolbarSlot from "./ToolbarSlot";

describe("ToolbarSlot", () => {
  it("holds one control of a toolbar", () => {
    const { container } = render(
      <ToolbarSlot className="extra">
        <select aria-label="Account" />
      </ToolbarSlot>,
    );
    expect(screen.getByRole("combobox", { name: "Account" })).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("extra");
  });
});
