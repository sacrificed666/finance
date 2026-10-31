import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SplitBar from "./SplitBar";

describe("SplitBar", () => {
  it("splits the bar by share and names each part on hover", () => {
    render(
      <SplitBar
        label="Spending by category"
        parts={[
          { id: "a", value: 3, color: "red", title: "Rent: 3" },
          { id: "b", value: 1, color: "blue", title: "Food: 1" },
        ]}
      />,
    );
    const bar = screen.getByRole("figure", { name: "Spending by category" });
    const [first, second] = bar.children;
    expect(first).toHaveStyle({ width: "75%" });
    expect(second).toHaveStyle({ width: "25%" });
    expect(second).toHaveAttribute("title", "Food: 1");
    expect(second).toHaveStyle({ "--i": "1" });
  });
});
