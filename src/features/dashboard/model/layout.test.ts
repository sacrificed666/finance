import { describe, expect, it } from "vitest";

import {
  DEFAULT_DASHBOARD,
  dashboardLayout,
  isDefaultDashboard,
  moveCard,
  normalizeDashboard,
  showCard,
  withoutCards,
} from "@/features/dashboard/model/layout";

describe("dashboardLayout", () => {
  it("starts from the default layout", () => {
    expect(dashboardLayout()).toEqual(DEFAULT_DASHBOARD);
    expect(isDefaultDashboard(dashboardLayout(null))).toBe(true);
  });

  it("keeps the saved order, drops unknown or repeated cards, and adds cards that are new", () => {
    const layout = dashboardLayout({
      main: ["spending", "quickAdd", "spending", "gone"],
      side: ["progress", "quickAdd"],
      hidden: ["recent", "recent", "nope", "currency"],
    });
    expect(layout.main).toEqual(["spending", "quickAdd", "start", "cashFlow", "cashAhead"]);
    expect(layout.side).toEqual(["progress", "comingUp", "recent", "holdings", "subscriptions"]);
    expect(layout.hidden).toEqual(["recent"]);
  });
});

describe("editing", () => {
  it("moves a card within its column and stops at the ends", () => {
    const down = moveCard(DEFAULT_DASHBOARD, "quickAdd", 1);
    expect(down.main.slice(1, 3)).toEqual(["cashFlow", "quickAdd"]);
    expect(moveCard(DEFAULT_DASHBOARD, "start", -1)).toBe(DEFAULT_DASHBOARD);
    expect(moveCard(DEFAULT_DASHBOARD, "progress", 1)).toBe(DEFAULT_DASHBOARD);
    expect(moveCard(DEFAULT_DASHBOARD, "holdings", -1).side).toEqual([
      "comingUp",
      "holdings",
      "recent",
      "subscriptions",
      "progress",
    ]);
  });

  it("hides and shows a card", () => {
    const hidden = showCard(DEFAULT_DASHBOARD, "progress", false);
    expect(hidden.hidden).toEqual(["progress"]);
    expect(showCard(hidden, "progress", true).hidden).toEqual([]);
  });
});

describe("withoutCards", () => {
  it("leaves cards out of every column and of the hidden ones", () => {
    const layout = withoutCards({ ...DEFAULT_DASHBOARD, hidden: ["start", "progress"] }, ["start"]);
    expect(layout.main[0]).toBe("quickAdd");
    expect(layout.hidden).toEqual(["progress"]);
  });
});

describe("normalizeDashboard", () => {
  it("stores nothing for the default layout or for rubbish", () => {
    expect(normalizeDashboard(DEFAULT_DASHBOARD)).toBeUndefined();
    expect(normalizeDashboard("wide")).toBeUndefined();
    expect(normalizeDashboard(null)).toBeUndefined();
  });

  it("keeps a changed layout", () => {
    expect(normalizeDashboard({ ...DEFAULT_DASHBOARD, hidden: ["quickAdd"] })?.hidden).toEqual(["quickAdd"]);
  });
});
