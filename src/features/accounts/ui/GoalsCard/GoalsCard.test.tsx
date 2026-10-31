import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Goal } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import GoalsCard from "./GoalsCard";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [
    {
      id: "trip",
      name: "Trip",
      icon: "✈️",
      kind: "savings",
      currency: "UAH",
      openingBalance: 4000,
      goal: { target: 10000, deadline: "2027-01-15" },
    },
    {
      id: "done",
      name: "Done",
      icon: "🎯",
      kind: "savings",
      currency: "UAH",
      openingBalance: 600,
      goal: { target: 500 },
    },
  ],
};

describe("GoalsCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the goals still open with what each still needs, the total left to the hero", () => {
    renderWithStore(<GoalsCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(goal: Goal) => void>()} />, { state });
    expect(screen.getByText("1 of 2 reached")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("6,000 ₴ to go")).toBeInTheDocument();
    expect(screen.queryByText("40%")).not.toBeInTheDocument();
  });

  it("shows a single goal on its own, with what it takes a month", () => {
    renderWithStore(<GoalsCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(goal: Goal) => void>()} />, {
      state: { ...state, savings: state.savings.slice(0, 1) },
    });
    expect(screen.queryByText("Closest to done")).not.toBeInTheDocument();
    expect(screen.getByText("Trip")).toBeInTheDocument();
    expect(screen.getByText(/\/mo keeps every deadline$/u)).toBeInTheDocument();
  });

  it("stays away without goals", () => {
    const { container } = renderWithStore(
      <GoalsCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(goal: Goal) => void>()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
