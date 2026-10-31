import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { rect } from "@/test/geometry";
import { renderWithI18n } from "@/test/render";

import StackedArea from "./StackedArea";

// Three years of savings and investments, month by month
const POINTS = Array.from({ length: 37 }, (_, index) => ({
  label: `${String(2026 + Math.floor(index / 12))}-${String((index % 12) + 1).padStart(2, "0")}`,
  a: 1000 + index * 50,
  b: 500 + index * 30,
}));

describe("StackedArea", () => {
  it("names both series, labels the years and lists every point", () => {
    renderWithI18n(<StackedArea points={POINTS} currency="UAH" />);
    expect(screen.getAllByText("Savings")).toHaveLength(2);
    expect(screen.getAllByText("2027").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("row")).toHaveLength(38);
  });

  it("shows a point with both series and their total", () => {
    const { container } = renderWithI18n(
      <StackedArea points={POINTS} currency="UAH" seriesA="Cash" seriesB="Funds" xTickFormat={(label) => label} />,
    );
    const area = container.querySelector("rect")!;
    area.getBoundingClientRect = () => rect(0, 0, 360, 100);
    fireEvent.pointerMove(area, { clientX: 0 });
    expect(container.querySelectorAll("svg circle")).toHaveLength(2);
    expect(screen.getAllByText("Funds")).toHaveLength(3);
    expect(screen.getAllByText("Total")).toHaveLength(2);
    fireEvent.pointerLeave(area);
    expect(container.querySelectorAll("svg circle")).toHaveLength(0);
  });

  it("shades the spread of the scenarios and tells it at a point", () => {
    const ranged = POINTS.map((point) => ({ ...point, low: point.a + point.b - 100, high: point.a + point.b + 100 }));
    const { container } = renderWithI18n(
      <StackedArea points={ranged} currency="UAH" rangeLabel="Spread" xTickFormat={(label) => label} />,
    );
    expect(screen.getAllByText("Spread")).toHaveLength(2);
    expect(container.querySelectorAll("svg path")).toHaveLength(4);
    const area = container.querySelector("rect")!;
    area.getBoundingClientRect = () => rect(0, 0, 360, 100);
    fireEvent.pointerMove(area, { clientX: 0 });
    expect(screen.getAllByText("Spread")).toHaveLength(3);
  });

  it("draws nothing for a single point", () => {
    const { container } = renderWithI18n(<StackedArea points={POINTS.slice(0, 1)} currency="UAH" />);
    expect(container.firstChild).toBeNull();
  });
});
