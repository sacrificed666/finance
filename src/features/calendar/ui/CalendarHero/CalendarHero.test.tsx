import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { daySummaries } from "@/features/calendar/model/monthEvents";
import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { renderWithStore } from "@/test/render";

import CalendarHero from "./CalendarHero";

const days = daySummaries(DEFAULT_STATE, "2026-10", [
  { id: "rent", date: "2026-10-20", kind: "expense", title: "Rent", icon: "🔑", amount: 400, currency: "UAH" },
  { id: "pay", date: "2026-10-25", kind: "income", title: "Pay", icon: "💼", amount: 1000, currency: "UAH" },
]);

describe("CalendarHero", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the month's net, what is still to move and the taxes due", () => {
    renderWithStore(
      <CalendarHero
        month="2026-10"
        chosen="2026-10"
        days={days}
        obligations={[{ id: "2026-Q3:esv", kind: "esv", period: "2026-Q3", due: "2026-10-20", amount: 5000 }]}
        onMonth={vi.fn<(month: string) => void>()}
      />,
    );
    expect(screen.getByText("+600 ₴")).toBeInTheDocument();
    expect(screen.getByText("Still to go out")).toBeInTheDocument();
    expect(screen.getByText("Still to come in")).toBeInTheDocument();
    expect(screen.getByText("1 deadline")).toBeInTheDocument();
    expect(screen.getByText("Busiest day")).toBeInTheDocument();
    expect(screen.getByText("Day by day")).toBeInTheDocument();
    expect(screen.getByText(/^lowest .*400 ₴ on 20 Oct$/u)).toBeInTheDocument();
    expect(screen.queryByText("No-spend days")).not.toBeInTheDocument();
  });

  it("names the busiest day's largest entry and counts the days without spending so far", () => {
    renderWithStore(
      <CalendarHero
        month="2026-10"
        chosen="2026-10"
        days={daySummaries(DEFAULT_STATE, "2026-10", [
          { id: "milk", date: "2026-10-02", kind: "expense", title: "Milk", icon: "🥛", amount: 50 },
          { id: "rent", date: "2026-10-03", kind: "expense", title: "Rent", icon: "🔑", amount: 400 },
          { id: "tea", date: "2026-10-03", kind: "expense", title: "Tea", icon: "🍵", amount: 20 },
        ])}
        obligations={[]}
        onMonth={vi.fn<(month: string) => void>()}
      />,
    );
    expect(screen.getByText("3 Oct")).toBeInTheDocument();
    expect(screen.getByText("420 ₴ · Rent")).toBeInTheDocument();
    expect(screen.getByText("No-spend days")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("out of 10 days so far")).toBeInTheDocument();
  });
});
