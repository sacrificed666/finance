import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Investment } from "@/features/data/model/types";
import { renderWithI18n } from "@/test/render";

import ReturnsTable from "./ReturnsTable";

const deposit: Investment = {
  id: "deposit",
  name: "Savings deposit",
  kind: "deposit",
  currency: "UAH",
  principal: 100000,
  annualRatePct: 12,
  startDate: "2026-10-10",
  compounding: "reinvest",
  compoundingFreq: "monthly",
};

const shares: Investment = {
  id: "shares",
  name: "Index fund",
  kind: "stocks",
  currency: "UAH",
  principal: 10000,
  marketValue: 9000,
  annualRatePct: 0,
  startDate: "2026-01-10",
  compounding: "reinvest",
  compoundingFreq: "annually",
};

// The table of two positions on 10 October 2026
const renderTable = () => {
  const onOpen = vi.fn<(inv: Investment) => void>();
  const view = renderWithI18n(
    <ReturnsTable positions={[deposit, shares]} today="2026-10-10" yearOut="2027-10-10" onOpen={onOpen} />,
  );
  return { onOpen, ...view };
};

describe("ReturnsTable", () => {
  it("shows what each position earned and what it should earn next", () => {
    renderTable();
    const [, first, second] = screen.getAllByRole("row");
    expect(first).toHaveTextContent("+12.7K ₴");
    expect(second).toHaveTextContent("−1,000 ₴");
    expect(second).toHaveTextContent("−10%");
    expect(within(second ?? document.body).getByText("-")).toBeInTheDocument();
  });

  it("opens a position from its name or from anywhere on its row", async () => {
    const { user, onOpen } = renderTable();
    await user.click(screen.getByRole("button", { name: /^Savings deposit/u }));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenLastCalledWith(deposit);
    await user.click(screen.getByText("−1,000 ₴"));
    expect(onOpen).toHaveBeenLastCalledWith(shares);
  });
});
