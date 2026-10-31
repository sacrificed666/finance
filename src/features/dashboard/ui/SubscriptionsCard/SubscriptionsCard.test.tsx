import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Subscription } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import SubscriptionsCard from "./SubscriptionsCard";

// A monthly subscription with the given fields
const subscription = (id: string, over: Partial<Subscription>): Subscription => ({
  id,
  name: id,
  icon: "📺",
  price: 300,
  currency: "UAH",
  period: "monthly",
  dayOfMonth: 15,
  startMonth: "2026-01",
  active: true,
  ...over,
});

describe("SubscriptionsCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invites to add subscriptions", () => {
    renderWithStore(<SubscriptionsCard />);
    expect(screen.getByText("No subscriptions this month")).toBeInTheDocument();
  });

  it("lists the dearest first with their next charge and monthly price", () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      subscriptions: [
        subscription("Music", { price: 100 }),
        subscription("Cloud", { price: 2400, period: "yearly", dayOfMonth: 1 }),
        subscription("Video", { endMonth: "2026-10", dayOfMonth: 5 }),
      ],
    };
    renderWithStore(<SubscriptionsCard />, { state });
    const rows = screen.getAllByRole("listitem");
    expect(rows.map((row) => row.querySelector("[class*=name]")?.textContent)).toEqual(["Video", "Cloud", "Music"]);
    expect(rows[0]).toHaveTextContent("last charge");
    expect(rows[1]).toHaveTextContent("billed yearly");
    expect(rows[1]).toHaveTextContent("200 ₴");
    expect(rows[1]).toHaveTextContent("1 Jan");
    expect(screen.getByText("2 billing this month · 7,200 ₴ a year")).toBeInTheDocument();
  });
});
