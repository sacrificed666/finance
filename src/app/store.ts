import { createContext } from "react";

import type { AppState } from "@/features/data/model/types";

export type SyncStatus = "idle" | "saving" | "error";

export interface StoreApi {
  state: AppState;
  hydrated: boolean;
  loadError: string | null;
  update: (change: (state: AppState) => AppState, undoLabel?: string) => void;
  quietUpdate: (change: (state: AppState) => AppState) => void;
  replace: (next: AppState, undoLabel?: string) => void;
  reload: () => Promise<void>;
  undo: () => void;
  dismissUndo: () => void;
}

export interface SyncApi {
  sync: SyncStatus;
  undoLabel: string | null;
  restored: number;
}

// The account's data and the ways to change it
export const StoreContext = createContext<StoreApi | null>(null);

// The save status and undo, apart so a save redraws only the dot and toast
export const SyncContext = createContext<SyncApi>({ sync: "idle", undoLabel: null, restored: 0 });
