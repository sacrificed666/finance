import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithI18n } from "@/test/render";

import MonthlyColumns from "./MonthlyColumns";

const DATA = [
  { month: "2026-07", income: 62_000, expense: 20_000 },
  { month: "2026-08", income: 50_000, expense: 25_000, tax: 3000 },
  { month: "2026-09", income: 0, expense: 1000 },
];

describe("MonthlyColumns", () => {
  it("draws income and expenses side by side with a legend and a table", () => {
    const { container } = renderWithI18n(<MonthlyColumns data={DATA} currency="UAH" />);
    expect(screen.getByRole("table", { name: "Income and expenses by month" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Month",
      "Income",
      "Expenses",
      "Net",
    ]);
    expect(screen.getAllByText("Expenses")).toHaveLength(2);
    expect(container.querySelectorAll("svg path").length).toBeGreaterThanOrEqual(5);
  });

  it("stacks the tax on top of income-only columns", () => {
    const { container } = renderWithI18n(<MonthlyColumns data={DATA} currency="UAH" incomeOnly />);
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Month", "Income", "Tax"]);
    expect(container.querySelectorAll("svg path[fill='var(--color-expense)']")).toHaveLength(1);
  });

  it("has no legend for income alone without tax", () => {
    renderWithI18n(<MonthlyColumns data={DATA.map((point) => ({ ...point, tax: 0 }))} currency="UAH" incomeOnly />);
    expect(screen.queryByText("Tax")).not.toBeInTheDocument();
    expect(screen.getAllByText("Income")).toHaveLength(1);
  });

  it("shows a month in a tooltip and fades the others", () => {
    const { container } = renderWithI18n(<MonthlyColumns data={DATA} currency="UAH" />);
    const areas = container.querySelectorAll("rect");
    fireEvent.pointerMove(areas[1]!);
    expect(screen.getAllByText("Net")).toHaveLength(2);
    expect(container.querySelectorAll("svg g[class*='dimmed']")).toHaveLength(2);
    fireEvent.pointerLeave(areas[1]!);
    expect(screen.getAllByText("Net")).toHaveLength(1);
  });

  it("shows the gross of a month with tax in the income tooltip", () => {
    const { container } = renderWithI18n(<MonthlyColumns data={DATA} currency="UAH" incomeOnly />);
    fireEvent.pointerMove(container.querySelectorAll("rect")[1]!);
    expect(screen.getByText("Gross")).toBeInTheDocument();
  });
});
