import { renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setHiddenAmounts } from "@/features/settings/model/hiddenAmounts";

import { OPEN_EVENT } from "./palette";
import { useShortcuts } from "./useShortcuts";

const nav = vi.hoisted(() => ({ push: vi.fn<(href: string) => void>() }));

vi.mock("next/navigation", () => ({ usePathname: () => "/reports", useRouter: () => ({ push: nav.push }) }));

describe("useShortcuts", () => {
  afterEach(() => {
    nav.push.mockClear();
    document.body.replaceChildren();
    setHiddenAmounts(false);
    localStorage.clear();
  });

  it("adds entries, opens pages and searches on single keys", async () => {
    const user = userEvent.setup();
    const opened = vi.fn<() => void>();
    window.addEventListener(OPEN_EVENT, opened);
    renderHook(() => useShortcuts());
    await user.keyboard("n");
    expect(nav.push).toHaveBeenLastCalledWith("/reports?add=expense", { scroll: false });
    await user.keyboard("i");
    expect(nav.push).toHaveBeenLastCalledWith("/reports?add=income", { scroll: false });
    await user.keyboard("4");
    expect(nav.push).toHaveBeenLastCalledWith("/transactions");
    await user.keyboard("/");
    expect(opened).toHaveBeenCalled();
    window.removeEventListener(OPEN_EVENT, opened);
  });

  it("hides amounts and shows them again on H", async () => {
    const user = userEvent.setup();
    renderHook(() => useShortcuts());
    await user.keyboard("h");
    expect(localStorage.getItem("finance:view:hiddenAmounts")).toBe("true");
    await user.keyboard("h");
    expect(localStorage.getItem("finance:view:hiddenAmounts")).toBe("false");
  });

  it("stays out of the way while something is typed or a key has a modifier", async () => {
    const user = userEvent.setup();
    renderHook(() => useShortcuts());
    const field = document.createElement("input");
    document.body.append(field);
    field.focus();
    await user.keyboard("n4");
    await user.keyboard("{Control>}n{/Control}");
    field.blur();
    await user.keyboard("x9");
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("does nothing once the device has turned them off in Settings", async () => {
    localStorage.setItem("finance:view:shortcuts", "false");
    const user = userEvent.setup();
    renderHook(() => useShortcuts());
    await user.keyboard("n1");
    expect(nav.push).not.toHaveBeenCalled();
  });
});
