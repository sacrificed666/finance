import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import GoalSheet from "./GoalSheet";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [
    { id: "jar", name: "Jar", icon: "🫙", kind: "savings", currency: "UAH", openingBalance: 3000 },
    { id: "old", name: "Old", icon: "💳", kind: "card", currency: "UAH", openingBalance: 0, archived: true },
  ],
};

describe("GoalSheet", () => {
  it("adds a goal with money put aside and an account that counts", async () => {
    const onClose = vi.fn<() => void>();
    const { user, probe } = renderWithStore(<GoalSheet target="new" onClose={onClose} />, { state });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: /Already put aside/u }), "1000");
    await user.type(screen.getByRole("textbox", { name: /What for/u }), "Trip");
    await user.type(screen.getByRole("textbox", { name: /How much you need/u }), "40000");
    expect(screen.queryByRole("button", { name: /Old/u })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Jar/u }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.goals).toEqual([
      expect.objectContaining({ name: "Trip", target: 40000, saved: 1000, accountIds: ["jar"] }),
    ]);
    expect(onClose).toHaveBeenCalled();
  });
});
