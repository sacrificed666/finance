import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { rect } from "@/test/geometry";

import BalanceLine from "./BalanceLine";

// Thirty days that dip below zero on the twentieth
const POINTS = Array.from({ length: 30 }, (_, index) => ({
  date: `2026-09-${String(index + 1).padStart(2, "0")}`,
  value: index === 19 ? -2500 : 10_000 - index * 100,
  change: index === 0 ? 0 : -100,
}));

// Draws the chart with English labels
const draw = (points = POINTS) =>
  render(
    <BalanceLine
      points={points}
      currency="UAH"
      caption="Next 30 days"
      dateLabel="Date"
      valueLabel="Balance"
      changeLabel="Change"
    />,
  );

describe("BalanceLine", () => {
  it("gives screen readers every day as a table", () => {
    draw();
    expect(screen.getByRole("table", { name: "Next 30 days" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(31);
  });

  it("draws the zero line in red and marks the lowest day when the balance dips below zero", () => {
    const { container } = draw();
    expect(container.querySelector("line[stroke='var(--color-expense)']")).toBeInTheDocument();
    expect(container.querySelector("circle")).toHaveAttribute("fill", "var(--color-expense)");
  });

  it("stays green without a dip and labels the ends and every seventh day", () => {
    const { container } = draw(POINTS.map((point) => ({ ...point, value: Math.abs(point.value) })));
    expect(container.querySelector("circle")).toHaveAttribute("fill", "var(--color-accent)");
    const dates = container.querySelectorAll("svg text[y='144']");
    expect(dates.length).toBeGreaterThanOrEqual(2);
  });

  it("shows the hovered day in a tooltip and hides it when the pointer leaves", () => {
    const { container } = draw();
    const area = container.querySelector("rect")!;
    area.getBoundingClientRect = () => rect(0, 0, 290, 100);
    fireEvent.pointerMove(area, { clientX: 290 });
    expect(screen.getAllByText("Balance")).toHaveLength(2);
    expect(screen.getAllByText("Change")).toHaveLength(2);
    fireEvent.pointerMove(area, { clientX: 0 });
    expect(screen.getAllByText("Change")).toHaveLength(1);
    fireEvent.pointerLeave(area);
    expect(screen.getAllByText("Balance")).toHaveLength(1);
  });

  it("draws nothing for a single day", () => {
    const { container } = draw(POINTS.slice(0, 1));
    expect(container.querySelector("svg")).toBeNull();
  });
});
