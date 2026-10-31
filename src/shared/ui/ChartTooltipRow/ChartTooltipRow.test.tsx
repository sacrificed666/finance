import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ChartTooltipRow from "./ChartTooltipRow";

describe("ChartTooltipRow", () => {
  it("shows a series with its colour and value", () => {
    const { container } = render(<ChartTooltipRow color="var(--color-income)" label="Income" value="62K ₴" />);
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByText("62K ₴")).toBeInTheDocument();
    expect(container.querySelector("span[aria-hidden]")).toHaveAttribute(
      "style",
      expect.stringContaining("var(--color-income)"),
    );
  });

  it("has no swatch without a colour", () => {
    const { container } = render(<ChartTooltipRow label="Total" value="1" />);
    expect(container.querySelector("span[aria-hidden]")).toBeNull();
  });
});
