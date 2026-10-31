import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { gamification } from "@/features/profile/model/achievements";
import { renderWithStore } from "@/test/render";

import StatsCard from "./StatsCard";

describe("StatsCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays away until there is an entry", () => {
    const { container } = renderWithStore(<StatsCard facts={gamification(DEFAULT_STATE).facts} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the money figures once there is an entry, the habits living in the hero", () => {
    const state = {
      ...DEFAULT_STATE,
      transactions: [
        {
          id: "milk",
          type: "expense" as const,
          amount: 100,
          currency: "UAH" as const,
          categoryId: "cat-groceries",
          date: "2026-10-05",
        },
      ],
    };
    renderWithStore(<StatsCard facts={gamification(state).facts} />, { state });
    expect(screen.getByText("Average spending")).toBeInTheDocument();
    expect(screen.queryByText("1/30")).not.toBeInTheDocument();
  });
});
