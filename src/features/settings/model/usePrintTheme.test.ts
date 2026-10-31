import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { usePrintTheme } from "./usePrintTheme";

const root = document.documentElement;

describe("usePrintTheme", () => {
  afterEach(() => {
    delete root.dataset.theme;
  });

  it("prints in the light theme and puts the dark one back", () => {
    root.dataset.theme = "dark";
    const { unmount } = renderHook(() => usePrintTheme());
    window.dispatchEvent(new Event("beforeprint"));
    window.dispatchEvent(new Event("beforeprint"));
    expect(root.dataset.theme).toBe("light");
    window.dispatchEvent(new Event("afterprint"));
    expect(root.dataset.theme).toBe("dark");
    unmount();
    window.dispatchEvent(new Event("beforeprint"));
    expect(root.dataset.theme).toBe("dark");
  });

  it("leaves no theme behind when the page had none", () => {
    renderHook(() => usePrintTheme());
    window.dispatchEvent(new Event("beforeprint"));
    expect(root.dataset.theme).toBe("light");
    window.dispatchEvent(new Event("afterprint"));
    expect(root.dataset.theme).toBeUndefined();
  });
});
