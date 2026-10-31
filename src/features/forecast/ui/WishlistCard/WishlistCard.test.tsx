import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import WishlistCard from "./WishlistCard";

const state: AppState = {
  ...DEFAULT_STATE,
  wishlist: [
    { id: "bike", name: "Bike", icon: "🚲", price: 3000, currency: "UAH", priority: "normal", createdAt: "2026-01-01" },
    {
      id: "tv",
      name: "TV",
      icon: "📺",
      price: 9000,
      currency: "UAH",
      priority: "high",
      month: "2027-01",
      createdAt: "2026-01-01",
    },
  ],
};

describe("WishlistCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invites to add the first wish", async () => {
    const { user } = renderWithStore(<WishlistCard />);
    expect(screen.getByText(/^Add what you want to buy/u)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("dialog", { name: "New wish" })).toBeInTheDocument();
  });

  it("lists the wishes by priority with their months and opens one", async () => {
    const { user } = renderWithStore(<WishlistCard />, { state });
    const rows = screen.getAllByRole("button", { name: /^(Bike|TV)/u });
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("planned for"),
      expect.stringContaining("Normal"),
    ]);
    expect(screen.getByText("Nothing is kept each month yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Bike/u }));
    expect(screen.getByRole("dialog", { name: "Edit wish" })).toBeInTheDocument();
  });
});
