import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, WishItem } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import WishSheet from "./WishSheet";

const bike: WishItem = {
  id: "bike",
  name: "Bike",
  icon: "🚲",
  price: 3000,
  currency: "UAH",
  priority: "normal",
  createdAt: "2026-01-01",
};

describe("WishSheet", () => {
  it("adds a wish once it has a name and a price", async () => {
    const onClose = vi.fn<() => void>();
    const { user, probe } = renderWithStore(<WishSheet target="new" onClose={onClose} />);
    expect(screen.getByText("Name what you want.")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("e.g. New laptop"), "Laptop");
    await user.type(screen.getByPlaceholderText("0"), "45000");
    await user.click(screen.getByRole("radio", { name: "High" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(probe.state.wishlist).toEqual([expect.objectContaining({ name: "Laptop", price: 45000, priority: "high" })]);
  });

  it("deletes a stored wish with an undo", async () => {
    const state: AppState = { ...DEFAULT_STATE, wishlist: [bike] };
    const { user, probe } = renderWithStore(<WishSheet target={bike} onClose={vi.fn<() => void>()} />, { state });
    const dialog = screen.getByRole("dialog", { name: "Edit wish" });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(probe.state.wishlist).toEqual([]);
    expect(probe.undoLabels).toContain("Wish deleted");
  });
});
