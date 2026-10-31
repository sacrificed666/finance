import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import CategorySheet from "./CategorySheet";

const state: AppState = {
  ...DEFAULT_STATE,
  categories: [{ id: "food", name: "Food", icon: "🍽️", colorSlot: 3, kind: "expense" }],
};

describe("CategorySheet", () => {
  it("adds a child in its parent's colour and unfolds the parent", async () => {
    const onAddedChild = vi.fn<(parentId: string) => void>();
    const { user, probe } = renderWithStore(
      <CategorySheet
        editing={null}
        parentId="food"
        kind="expense"
        onClose={vi.fn<() => void>()}
        onAddedChild={onAddedChild}
      />,
      { state },
    );
    expect(screen.getByRole("radio", { name: "Colour 3" })).toBeChecked();
    await user.type(screen.getByRole("textbox", { name: /^Name/u }), "Snacks");
    await user.click(screen.getByRole("radio", { name: "Colour 5" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.categories.at(-1)).toMatchObject({ name: "Snacks", parentId: "food", colorSlot: 5 });
    expect(onAddedChild).toHaveBeenCalledWith("food");
  });
});
