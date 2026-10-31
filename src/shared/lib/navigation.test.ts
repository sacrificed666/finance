import { describe, expect, it } from "vitest";

import { AUTH_PATHS, MORE, NAV, PAGE_BOOT, pageItem, PROFILE, SETTINGS, signInHref, TAB_BAR } from "./navigation";

describe("navigation", () => {
  it("splits the pages between the tab bar and More", () => {
    expect(NAV).toHaveLength(8);
    expect(TAB_BAR.map((item) => item.href)).toEqual(["/", "/transactions", "/accounts"]);
    expect(MORE.map((item) => item.href)).toEqual([
      "/calendar",
      "/reports",
      "/income",
      "/investments",
      "/forecast",
      "/profile",
      "/settings",
    ]);
  });

  it("gives every page its own tone and finds a page by its address", () => {
    const pages = [...NAV, PROFILE, SETTINGS];
    expect(new Set(pages.map((item) => item.tone)).size).toBe(pages.length);
    expect(pageItem("/settings")).toBe(SETTINGS);
    expect(pageItem("/transactions")?.tone).toBe("expenses");
    expect(pageItem("/nowhere")).toBeUndefined();
  });

  it("names the open page on the root before the first paint", () => {
    window.history.replaceState(null, "", "/transactions");
    const script = document.createElement("script");
    script.textContent = PAGE_BOOT;
    document.head.append(script);
    script.remove();
    expect(document.documentElement.dataset.page).toBe("expenses");
    window.history.replaceState(null, "", "/");
    delete document.documentElement.dataset.page;
  });

  it("knows the pages without a session and the way back after signing in", () => {
    expect(AUTH_PATHS.has("/login")).toBe(true);
    expect(signInHref("/")).toBe("/login");
    expect(signInHref("/income?add=income")).toBe("/login?next=%2Fincome%3Fadd%3Dincome");
  });
});
