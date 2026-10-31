"use client";

import { useEffect, useEffectEvent } from "react";

import { useStore } from "@/app/hooks";
import { snapshotMoved, todaySnapshot } from "@/features/dashboard/model/history";
import { todayISO } from "@/shared/lib/date";

// Keeps today's net worth in the history whenever it moves by a hryvnia or more
export const useSnapshotRecorder = () => {
  const { state, hydrated, loadError, quietUpdate } = useStore();
  const snapshot = todaySnapshot(state, todayISO());
  const changed = snapshotMoved(
    state.snapshots.find((kept) => kept.date === snapshot.date),
    snapshot,
  );
  const hasData = state.savings.length > 0 || state.investments.length > 0 || state.debts.length > 0;

  // Replaces the day's snapshot with the new one, without an undo
  const record = useEffectEvent(() =>
    quietUpdate((s) => ({ ...s, snapshots: [...s.snapshots.filter((kept) => kept.date !== snapshot.date), snapshot] })),
  );

  // Records once the data is in and only when the figures moved
  useEffect(() => {
    if (!hydrated || loadError || !hasData || !changed) return;
    record();
  }, [hydrated, loadError, hasData, changed]);
};
