import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OPEN_EVENT } from "@/features/commands/model/palette";
import { renderWithStore } from "@/test/render";

import TopBar from "./TopBar";

describe("TopBar", () => {
  const opened = vi.fn<() => void>();

  afterEach(() => {
    window.removeEventListener(OPEN_EVENT, opened);
    opened.mockReset();
  });

  it("shows a save in progress and opens the palette from the search", async () => {
    window.addEventListener(OPEN_EVENT, opened);
    const { user } = renderWithStore(<TopBar />, { sync: { sync: "saving" } });
    expect(screen.getByText("Saving")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Search and commands" }));
    expect(opened).toHaveBeenCalledOnce();
  });
});
