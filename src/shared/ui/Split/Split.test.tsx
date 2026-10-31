import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Split from "./Split";

describe("Split", () => {
  it("puts the main and side blocks into their columns", () => {
    render(<Split main={<p>Ledger</p>} side={<p>Budgets</p>} />);
    expect(screen.getByText("Ledger").parentElement?.className).toMatch(/main/u);
    expect(screen.getByText("Budgets").parentElement?.className).toMatch(/side/u);
  });

  it("can put the side column first on phones and keep it in view", () => {
    render(<Split main={<p>Categories</p>} side={<p>General</p>} sideFirst stickySide />);
    expect(screen.getByText("Categories").parentElement?.className).toMatch(/mainSecond/u);
    const side = screen.getByText("General").parentElement?.className;
    expect(side).toMatch(/sideFirst/u);
    expect(side).toMatch(/sticky/u);
  });

  it("ends with the tail, after the side cards in the reading order", () => {
    const { container } = render(<Split main={<p>Months</p>} side={<p>Sources</p>} tail={<p>Every income</p>} />);
    expect(container.firstElementChild?.className).toMatch(/withTail/u);
    expect([...(container.firstElementChild?.children ?? [])].map((column) => column.textContent)).toEqual([
      "Months",
      "Sources",
      "Every income",
    ]);
  });
});
