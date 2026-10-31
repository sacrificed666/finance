import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { WeekSummary } from "@/features/calendar/model/monthEvents";
import { renderWithI18n } from "@/test/render";

import WeeksCard from "./WeeksCard";

const weeks: WeekSummary[] = [
  { from: "2026-10-01", to: "2026-10-04", spent: 1500, earned: 0, entries: 2 },
  { from: "2026-10-05", to: "2026-10-11", spent: 300, earned: 62000, entries: 3 },
  { from: "2026-10-12", to: "2026-10-18", spent: 0, earned: 0, entries: 0 },
];

describe("WeeksCard", () => {
  it("lists each week's spending, marks this week and opens a week's day", async () => {
    const onPick = vi.fn<(date: string) => void>();
    const { user } = renderWithI18n(<WeeksCard weeks={weeks} today="2026-10-07" currency="UAH" onPick={onPick} />);
    expect(screen.getByText("1 Oct to 4 Oct")).toBeInTheDocument();
    expect(screen.getByText("−1,500 ₴")).toBeInTheDocument();
    expect(screen.getByText("+62K ₴ in")).toBeInTheDocument();
    expect(screen.getByText("this week")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^5 Oct to 11 Oct/u }));
    expect(onPick).toHaveBeenCalledWith("2026-10-07");
    await user.click(screen.getByRole("button", { name: /^12 Oct to 18 Oct/u }));
    expect(onPick).toHaveBeenLastCalledWith("2026-10-12");
  });

  it("stays away in a month without entries", () => {
    const { container } = renderWithI18n(
      <WeeksCard weeks={weeks.slice(2)} today="2026-10-07" currency="UAH" onPick={vi.fn<(date: string) => void>()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
