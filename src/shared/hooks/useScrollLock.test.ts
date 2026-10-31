import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useScrollLock } from "./useScrollLock";

describe("useScrollLock", () => {
  it("locks the page once for dialogs on top of each other", () => {
    document.body.style.overflow = "auto";
    const first = renderHook(() => useScrollLock(true));
    const second = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe("hidden");
    first.unmount();
    expect(document.body.style.overflow).toBe("hidden");
    second.unmount();
    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";
  });

  it("leaves the page alone while inactive", () => {
    renderHook(() => useScrollLock(false));
    expect(document.body.style.overflow).toBe("");
  });
});
