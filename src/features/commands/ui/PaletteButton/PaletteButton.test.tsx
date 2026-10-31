import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OPEN_EVENT } from "@/features/commands/model/palette";
import { renderWithI18n } from "@/test/render";

import PaletteButton from "./PaletteButton";

describe("PaletteButton", () => {
  it("opens the palette and shows the shortcut of the platform", async () => {
    const listener = vi.fn<() => void>();
    window.addEventListener(OPEN_EVENT, listener);
    const { user } = renderWithI18n(<PaletteButton className="extra" />);
    const button = screen.getByRole("button", { name: /Search/u });
    expect(button).toHaveClass("extra");
    expect(button).toHaveTextContent("Ctrl K");
    await user.click(button);
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(OPEN_EVENT, listener);
  });

  it("shows Cmd on Apple devices", () => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    renderWithI18n(<PaletteButton />);
    expect(screen.getByRole("button")).toHaveTextContent("⌘K");
  });
});
