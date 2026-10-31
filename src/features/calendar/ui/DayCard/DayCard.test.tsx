import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DaySummary } from "@/features/calendar/model/monthEvents";
import type { Transaction } from "@/features/data/model/types";
import { renderWithI18n } from "@/test/render";

import DayCard from "./DayCard";

const tx: Transaction = {
  id: "milk",
  type: "expense",
  amount: 100,
  currency: "UAH",
  categoryId: "cat-groceries",
  date: "2026-10-10",
};

const day: DaySummary = {
  date: "2026-10-10",
  net: -100,
  spent: 100,
  events: [
    { id: "milk", date: "2026-10-10", kind: "expense", title: "Milk", icon: "🥛", amount: 100, currency: "UAH", tx },
  ],
};

describe("DayCard", () => {
  it("shows today's events and opens an entry", async () => {
    const onOpen = vi.fn<(entry: Transaction) => void>();
    const { user } = renderWithI18n(
      <DayCard day={day} today="2026-10-10" currency="UAH" onAdd={vi.fn<() => void>()} onOpen={onOpen} />,
    );
    expect(screen.getByText("Today")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Milk/u }));
    expect(onOpen).toHaveBeenCalledWith(tx);
  });

  it("says a day ahead is quiet", () => {
    renderWithI18n(
      <DayCard
        day={{ date: "2026-10-12", net: 0, spent: 0, events: [] }}
        today="2026-10-10"
        currency="UAH"
        onAdd={vi.fn<() => void>()}
        onOpen={vi.fn<(entry: Transaction) => void>()}
      />,
    );
    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.getByText("Nothing on this day.")).toBeInTheDocument();
  });

  it("leaves out the day's total when only a deadline falls on it", () => {
    renderWithI18n(
      <DayCard
        day={{
          date: "2026-10-20",
          net: 0,
          spent: 0,
          events: [
            { id: "tax:esv", date: "2026-10-20", kind: "tax", title: "ЄСВ", icon: "🧾", amount: 5000, currency: "UAH" },
          ],
        }}
        today="2026-10-10"
        currency="UAH"
        onAdd={vi.fn<() => void>()}
        onOpen={vi.fn<(entry: Transaction) => void>()}
      />,
    );
    expect(screen.getByText("ЄСВ")).toBeInTheDocument();
    expect(screen.queryByText(/entr(y|ies)$/u)).not.toBeInTheDocument();
  });
});
