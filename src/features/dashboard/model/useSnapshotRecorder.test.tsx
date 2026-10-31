import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, NetWorthSnapshot } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import { useSnapshotRecorder } from "./useSnapshotRecorder";

// The hook inside the test store
const Recorder = () => {
  useSnapshotRecorder();
  return null;
};

// The default data with a card holding some hryvnias
const withCard = (balance: number, snapshots: NetWorthSnapshot[] = []): AppState => ({
  ...DEFAULT_STATE,
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: balance }],
  snapshots,
});

// A snapshot of a day with this total
const kept = (date: string, total: number): NetWorthSnapshot => ({
  date,
  total,
  savings: total,
  investments: 0,
  debts: 0,
  receivables: 0,
  rates: DEFAULT_STATE.settings.rates,
});

describe("useSnapshotRecorder", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-17T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records today's net worth next to the earlier days", () => {
    const { probe } = renderWithStore(<Recorder />, { state: withCard(1200, [kept("2026-10-16", 900)]) });
    expect(probe.state.snapshots.map((snapshot) => [snapshot.date, snapshot.total])).toEqual([
      ["2026-10-16", 900],
      ["2026-10-17", 1200],
    ]);
  });

  it("leaves today's snapshot alone while the figures hold", () => {
    const today = kept("2026-10-17", 1199.5);
    const { probe } = renderWithStore(<Recorder />, { state: withCard(1200, [today]) });
    expect(probe.state.snapshots).toEqual([today]);
  });

  it("records nothing for an empty account", () => {
    const { probe } = renderWithStore(<Recorder />);
    expect(probe.state.snapshots).toEqual([]);
  });
});
