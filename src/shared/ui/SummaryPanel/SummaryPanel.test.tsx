import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SummaryPanel from "./SummaryPanel";

describe("SummaryPanel", () => {
  it("shows the figure, what it is against and what follows", () => {
    render(
      <SummaryPanel value="11.5K ₴ left" meta="of 13.5K ₴" tone="income" className="extra">
        <span>meter</span>
      </SummaryPanel>,
    );
    const value = screen.getByText("11.5K ₴ left");
    expect(value.className).toMatch(/income/u);
    expect(screen.getByText("of 13.5K ₴")).toBeInTheDocument();
    expect(screen.getByText("meter")).toBeInTheDocument();
  });

  it("is plain ink without a tone and leaves out what it is not given", () => {
    const { container } = render(<SummaryPanel value="498 ₴" />);
    expect(screen.getByText("498 ₴").className).toMatch(/plain/u);
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});
