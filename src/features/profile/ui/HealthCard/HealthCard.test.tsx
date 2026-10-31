import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { gamification } from "@/features/profile/model/achievements";
import { renderWithI18n } from "@/test/render";

import HealthCard from "./HealthCard";

describe("HealthCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for the first entries before scoring", () => {
    const { health, facts } = gamification(DEFAULT_STATE);
    renderWithI18n(<HealthCard health={health} facts={facts} />);
    expect(screen.getByText("No score yet")).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("shows the score, its parts and tips that link to where they improve", () => {
    const { health, facts } = gamification({
      ...DEFAULT_STATE,
      transactions: [
        { id: "milk", type: "expense", amount: 100, currency: "UAH", categoryId: "cat-groceries", date: "2026-10-05" },
      ],
    });
    renderWithI18n(<HealthCard health={health} facts={facts} />);
    expect(screen.getByText(`${String(health.score)}/100`)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
  });
});
