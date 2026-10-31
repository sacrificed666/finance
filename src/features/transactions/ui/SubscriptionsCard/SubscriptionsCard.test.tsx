import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Subscription, Transaction } from "@/features/data/model/types";
import { chooseValue } from "@/test/choose";
import { renderWithStore } from "@/test/render";

import SubscriptionsCard from "./SubscriptionsCard";

// A monthly subscription with the given fields
const subscription = (over: Partial<Subscription> & Pick<Subscription, "id" | "name">): Subscription => ({
  icon: "📱",
  price: 100,
  currency: "UAH",
  period: "monthly",
  dayOfMonth: 1,
  startMonth: "2026-01",
  active: true,
  ...over,
});

// A music charge on the fifth of a month
const charge = (month: string): Transaction => ({
  id: `spot-${month}`,
  type: "expense",
  amount: 199,
  currency: "UAH",
  categoryId: "cat-subscriptions",
  date: `2026-${month}-05`,
  note: "Spotify",
});

const state: AppState = {
  ...DEFAULT_STATE,
  subscriptions: [
    subscription({ id: "video", name: "Video", price: 300, dayOfMonth: 9 }),
    subscription({ id: "cloud", name: "Cloud", period: "yearly", price: 1206, dayOfMonth: 20 }),
    subscription({ id: "news", name: "News", startMonth: "2027-02" }),
  ],
};

describe("SubscriptionsCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-15T12:00:00"), toFake: ["Date"] });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("totals the month's subscriptions and lists them by name", () => {
    renderWithStore(<SubscriptionsCard month="2026-10" />, { state });
    expect(screen.getByText("4,806 ₴ a year")).toBeInTheDocument();
    expect(screen.getByText("300 ₴")).toBeInTheDocument();
    expect(screen.getByText("100.50 ₴")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((row) => row.querySelector("[class*=name]")?.textContent)).toEqual([
      "Cloud",
      "Video",
    ]);
    expect(screen.getByText("1,206 ₴ · every year on 20 Jan")).toBeInTheDocument();
  });

  it("orders them by price on request once there are enough to sort", async () => {
    const { user, unmount } = renderWithStore(<SubscriptionsCard month="2026-10" />, { state });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    unmount();
    const more = [
      subscription({ id: "music", name: "Music", price: 50 }),
      subscription({ id: "games", name: "Games", price: 80 }),
    ];
    renderWithStore(<SubscriptionsCard month="2026-10" />, {
      state: { ...state, subscriptions: [...state.subscriptions, ...more] },
    });
    await chooseValue(user, screen.getByRole("combobox"), "price");
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Music");
  });

  it("opens one to edit it", async () => {
    const { user } = renderWithStore(<SubscriptionsCard month="2026-10" />, { state });
    await user.click(screen.getByRole("button", { name: /^Video/u }));
    expect(screen.getByRole("dialog", { name: "Edit subscription" })).toBeInTheDocument();
  });

  it("invites to add the first one", () => {
    renderWithStore(<SubscriptionsCard month="2026-10" />);
    expect(screen.getByText("No subscriptions yet")).toBeInTheDocument();
  });

  it("suggests a charge that repeats every month and remembers a dismissal", async () => {
    const withCharges: AppState = { ...DEFAULT_STATE, transactions: ["07", "08", "09"].map(charge) };
    const { user, unmount } = renderWithStore(<SubscriptionsCard month="2026-10" />, { state: withCharges });
    expect(screen.getByText("Looks like a subscription")).toBeInTheDocument();
    expect(screen.getByText(/charged 3 months running/u)).toBeInTheDocument();
    const suggestion = screen.getByText("Spotify").closest("li")!;
    await user.click(within(suggestion).getByRole("button", { name: "Add" }));
    expect(within(screen.getByRole("dialog")).getByDisplayValue("Spotify")).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Not a subscription" }));
    expect(screen.queryByText("Looks like a subscription")).not.toBeInTheDocument();
    unmount();
    renderWithStore(<SubscriptionsCard month="2026-10" />, { state: withCharges });
    expect(screen.queryByText("Looks like a subscription")).not.toBeInTheDocument();
  });
});
