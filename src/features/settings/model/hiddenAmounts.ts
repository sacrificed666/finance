"use client";

import { useSyncExternalStore } from "react";

import { isStoredKey, readStored, writeStored } from "@/shared/hooks/usePersistentState";

// The device's choice to show amounts as dots, kept off other devices
export const HIDDEN_AMOUNTS_KEY = "hiddenAmounts";

// The components that follow the choice
const listeners = new Set<() => void>();

// The choice as last read or made, read again when another tab changes it
let hidden: boolean | null = null;

// Whether this device hides amounts
const snapshot = (): boolean => {
  hidden ??= readStored(HIDDEN_AMOUNTS_KEY, false);
  return hidden;
};

// Pages drawn on the server never hide, the browser's choice comes after
const serverSnapshot = (): boolean => false;

// Calls back when the choice changes in this tab or another one
const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  // Takes up a choice another tab made
  const onStorage = (event: StorageEvent) => {
    if (!isStoredKey(event.key, HIDDEN_AMOUNTS_KEY)) return;
    hidden = null;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
};

// Whether amounts show as dots on this device
export const useHiddenAmounts = (): boolean => useSyncExternalStore(subscribe, snapshot, serverSnapshot);

// Hides or shows amounts on this device and redraws what follows the choice
export const setHiddenAmounts = (next: boolean): void => {
  hidden = next;
  writeStored(HIDDEN_AMOUNTS_KEY, next);
  for (const listener of listeners) listener();
};
