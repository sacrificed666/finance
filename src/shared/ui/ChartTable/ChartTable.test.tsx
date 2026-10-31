import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ChartTable from "./ChartTable";

describe("ChartTable", () => {
  it("gives screen readers the chart's figures with row headers", () => {
    render(
      <ChartTable
        caption="Cash flow"
        columns={["Month", "Income", "Expenses"]}
        rows={[{ key: "2026-09", cells: ["September", "62K", "20K"] }]}
      />,
    );
    const table = screen.getByRole("table", { name: "Cash flow" });
    expect(table).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getByRole("rowheader", { name: "September" })).toBeInTheDocument();
    expect(screen.getAllByRole("cell")).toHaveLength(2);
  });
});
