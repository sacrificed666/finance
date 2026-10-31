import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithI18n } from "@/test/render";

import KeptCard from "./KeptCard";

// A month's totals with its net worked out
const totals = (month: string, income: number, expense: number) => ({ month, income, expense, net: income - expense });

const YEAR = [
  totals("2026-07", 0, 0),
  totals("2026-08", 1000, 600),
  totals("2026-09", 1000, 1200),
  totals("2026-10", 1000, 200),
];

describe("KeptCard", () => {
  it("bars each month's kept share from the first with income, the average on top", () => {
    renderWithI18n(<KeptCard year={YEAR} month="2026-10" />);
    expect(screen.getByText(/33% on average/u)).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual(["Aug40%", "Sept−20%", "Oct80%"]);
  });

  it("stays away with fewer than two months of income", () => {
    const { container } = renderWithI18n(<KeptCard year={YEAR.slice(0, 2)} month="2026-08" />);
    expect(container).toBeEmptyDOMElement();
  });
});
