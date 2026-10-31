"use client";

import { useState } from "react";

// Every view preference is stored under this prefix
const PREFIX = "finance:view:";

// Whether a stored value has the type of the initial one
const isLike = <T>(value: unknown, like: T): value is T => typeof value === typeof like;

// A key's stored value, or the initial one when missing, invalid or unreadable
export const readStored = <T>(key: string, initial: T, isValid?: (value: unknown) => value is T): T => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return initial;
    const parsed: unknown = JSON.parse(raw);
    if (isValid) return isValid(parsed) ? parsed : initial;
    return isLike(parsed, initial) ? parsed : initial;
  } catch {
    return initial;
  }
};

// Stores a key's value; a blocked storage keeps the choice for this visit only
export const writeStored = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Private windows and blocked site data refuse to store
  }
};

// Whether a storage event from another tab is about a key
export const isStoredKey = (storageKey: string | null, key: string): boolean => storageKey === PREFIX + key;

// State that a list remembers in the browser, such as its sort order
export const usePersistentState = <T>(key: string, initial: T, isValid?: (value: unknown) => value is T) => {
  const [value, setValue] = useState<T>(() => readStored(key, initial, isValid));
  // Changes the value and stores it; storage can be blocked, the state still changes
  const set = (next: T) => {
    setValue(next);
    writeStored(key, next);
  };
  return [value, set] as const;
};
