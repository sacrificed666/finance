import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { rect } from "@/test/geometry";
import { renderWithI18n } from "@/test/render";

import PaceLines from "./PaceLines";

// Draws fifteen days of this month against thirty of the last
const draw = (current = Array.from({ length: 15 }, (_, index) => (index + 1) * 100)) =>
  renderWithI18n(
    <PaceLines
      current={current}
      previous={Array.from({ length: 30 }, (_, index) => (index + 1) * 80)}
      days={30}
      currency="UAH"
      currentLabel="Sept"
      previousLabel="Aug"
      caption="Spending pace"
      dayLabel={(day) => `Day ${String(day)}`}
    />,
  );

describe("PaceLines", () => {
  it("names both months and lists every day for screen readers", () => {
    draw();
    const table = screen.getByRole("table", { name: "Spending pace" });
    expect(within(table).getAllByRole("row")).toHaveLength(31);
    expect(within(table).getByRole("rowheader", { name: "Day 30" }).parentElement).toHaveTextContent("-");
    expect(screen.getAllByText("Sept")).toHaveLength(2);
  });

  it("draws both lines and marks the latest day", () => {
    const { container } = draw();
    expect(container.querySelectorAll("svg path")).toHaveLength(3);
    expect(container.querySelector("circle")).toHaveAttribute("fill", "var(--color-expense)");
  });

  it("shows a day in a tooltip, only with the months that reach it", () => {
    const { container } = draw();
    const area = container.querySelector("rect")!;
    area.getBoundingClientRect = () => rect(0, 0, 290, 100);
    fireEvent.pointerMove(area, { clientX: 0 });
    expect(screen.getAllByText("Day 1")).toHaveLength(2);
    expect(screen.getAllByText("Sept")).toHaveLength(3);
    fireEvent.pointerMove(area, { clientX: 290 });
    expect(screen.getAllByText("Day 30")).toHaveLength(2);
    expect(screen.getAllByText("Sept")).toHaveLength(2);
    fireEvent.pointerLeave(area);
    expect(screen.getAllByText("Day 30")).toHaveLength(1);
  });

  it("draws no line or dot for a month without days", () => {
    const { container } = draw([]);
    expect(container.querySelector("circle")).toBeNull();
    expect(container.querySelectorAll("svg path")).toHaveLength(1);
  });
});
