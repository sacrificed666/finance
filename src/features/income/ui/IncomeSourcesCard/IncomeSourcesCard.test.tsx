import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import IncomeSourcesCard from "./IncomeSourcesCard";

// An income on a day
const income = (id: string, amount: number, currency: Transaction["currency"], categoryId: string): Transaction => ({
  id,
  type: "income",
  amount,
  currency,
  categoryId,
  date: "2026-09-05",
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [income("pay", 40000, "UAH", "cat-salary"), income("gig", 500, "USD", "cat-freelance")],
};

describe("IncomeSourcesCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("breaks the year down by source and, on request, by currency", async () => {
    const { user } = renderWithStore(<IncomeSourcesCard />, { state });
    expect(screen.getByText("Last 12 months · 2 sources")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Currency" }));
    expect(screen.getAllByText("USD").length).toBeGreaterThan(0);
    expect(screen.getByText("$500")).toBeInTheDocument();
  });

  it("stays away without income", () => {
    const { container } = renderWithStore(<IncomeSourcesCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
