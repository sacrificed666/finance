import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { daySummaries } from "@/features/calendar/model/monthEvents";
import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { renderWithI18n } from "@/test/render";

import MonthGrid from "./MonthGrid";

const days = daySummaries(DEFAULT_STATE, "2026-10", [
  { id: "milk", date: "2026-10-03", kind: "expense", title: "Milk", icon: "🥛", amount: 100, currency: "UAH" },
]);

describe("MonthGrid", () => {
  it("lays the month out from Monday with a button a day and picks one", async () => {
    const onPick = vi.fn<(date: string) => void>();
    const { user, container } = renderWithI18n(
      <MonthGrid month="2026-10" days={days} today="2026-10-10" selected="2026-10-10" currency="UAH" onPick={onPick} />,
    );
    const cells = [...(container.querySelector("[class*=grid]")?.children ?? [])];
    expect(cells.slice(7, 10).map((cell) => cell.tagName)).toEqual(["SPAN", "SPAN", "SPAN"]);
    expect(cells[10]).toHaveTextContent("1");
    expect(screen.getAllByRole("button")).toHaveLength(31);
    expect(screen.getByRole("button", { pressed: true })).toHaveTextContent("10");
    await user.click(screen.getByRole("button", { name: /1 entry$/u }));
    expect(onPick).toHaveBeenCalledWith("2026-10-03");
    expect(screen.getByText("Expenses")).toBeInTheDocument();
    expect(screen.queryByText("Taxes")).not.toBeInTheDocument();
  });

  it("leaves the key out of a month without events", () => {
    const quiet = daySummaries(DEFAULT_STATE, "2026-10", []);
    renderWithI18n(
      <MonthGrid
        month="2026-10"
        days={quiet}
        today="2026-10-10"
        selected="2026-10-10"
        currency="UAH"
        onPick={vi.fn<(date: string) => void>()}
      />,
    );
    expect(screen.queryByText("Expenses")).not.toBeInTheDocument();
  });
});
