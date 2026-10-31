"use client";

import { useEffect } from "react";

import { useStore } from "@/app/hooks";

import { mergeEvents, parseLegacyEvents } from "./events";

// Where an older version kept the planned events in the browser
const LEGACY_KEY = "finance-tracker:view:forecast.events";

// The stored browser value, or null when storage is blocked
const readLegacy = () => {
  try {
    return localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
};

// Forgets the old browser value once its events are saved
const forgetLegacy = () => {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Blocked storage keeps the value, and the next visit merges it again
  }
};

// Moves planned events an older version kept in this browser into the account
export const useLegacyEvents = () => {
  const { update, hydrated } = useStore();
  // Merges once the account's data is in
  useEffect(() => {
    if (!hydrated) return;
    const older = parseLegacyEvents(readLegacy());
    if (older.length === 0) return;
    update((s) => ({ ...s, plannedEvents: mergeEvents(s.plannedEvents, older) }));
    forgetLegacy();
  }, [hydrated, update]);
};
