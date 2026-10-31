import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AchievementState } from "@/features/profile/model/achievements";
import { renderWithI18n } from "@/test/render";

import AchievementsCard from "./AchievementsCard";

// An achievement with the given fields
const achievement = (id: string, over: Partial<AchievementState>): AchievementState => ({
  id,
  icon: "🏅",
  tier: "bronze",
  group: "tracking",
  xp: 50,
  current: 0,
  target: 10,
  progress: 0,
  unlocked: false,
  ...over,
});

const list = [
  achievement("done", { unlocked: true, current: 10, progress: 1, tier: "gold" }),
  achievement("close", { current: 8, progress: 0.8 }),
  ...Array.from({ length: 12 }, (_, index) => achievement(`far-${String(index)}`, {})),
];

describe("AchievementsCard", () => {
  it("counts each tier, shows the closest ones and folds the long list", async () => {
    const { user } = renderWithI18n(<AchievementsCard achievements={list} />);
    expect(screen.getByText("1 of 14 unlocked")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(12);
    await user.click(screen.getByRole("button", { name: /Show all 14/u }));
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
  });

  it("filters to the unlocked ones", async () => {
    const { user } = renderWithI18n(<AchievementsCard achievements={list} />);
    await user.click(screen.getByRole("radio", { name: /^Unlocked/u }));
    expect(screen.queryByRole("button", { name: /Show all/u })).not.toBeInTheDocument();
  });
});
