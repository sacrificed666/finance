import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, NetWorthSnapshot } from "@/features/data/model/types";

import { snapshotMoved, todaySnapshot, worthHistory } from "./history";

// A snapshot of a day's net worth in hryvnias
const snapshot = (date: string, total: number): NetWorthSnapshot => ({
  date,
  total,
  savings: total,
  investments: 0,
  debts: 0,
  receivables: 0,
  rates: { USD: 40, EUR: 45 },
});

const state: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, baseCurrency: "USD", rates: { USD: 40, EUR: 45 } },
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "USD", openingBalance: 100 }],
  snapshots: [snapshot("2026-08-01", 2000), snapshot("2026-08-20", 3200)],
};

describe("worthHistory", () => {
  it("takes each month's last snapshot and counts the months without one", () => {
    const history = worthHistory(state, "2026-10-10", 3);
    expect(history).toEqual([80, 100, 100]);
  });
});

describe("todaySnapshot and snapshotMoved", () => {
  it("keeps today's figures in hryvnias and notices a move of a hryvnia", () => {
    const today = todaySnapshot(state, "2026-10-10");
    expect(today).toMatchObject({ date: "2026-10-10", total: 4000, savings: 4000, rates: { USD: 40, EUR: 45 } });
    expect(snapshotMoved(undefined, today)).toBe(true);
    expect(snapshotMoved({ ...today, total: 4000.5 }, today)).toBe(false);
    expect(snapshotMoved({ ...today, total: 3990 }, today)).toBe(true);
  });
});
