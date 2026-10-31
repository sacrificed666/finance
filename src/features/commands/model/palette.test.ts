import { describe, expect, it, vi } from "vitest";

import { COMMAND_GROUPS, OPEN_EVENT, openCommandPalette } from "./palette";

describe("palette", () => {
  it("opens the palette through a window event", () => {
    const listener = vi.fn<() => void>();
    window.addEventListener(OPEN_EVENT, listener);
    openCommandPalette();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(OPEN_EVENT, listener);
  });

  it("lists actions first and entries last", () => {
    expect(COMMAND_GROUPS[0]).toBe("actions");
    expect(COMMAND_GROUPS.at(-1)).toBe("entries");
  });
});
