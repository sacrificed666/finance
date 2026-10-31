import { use } from "react";

import { type StoreApi, StoreContext, type SyncApi, SyncContext } from "@/app/store";

// The account's data and the ways to change it, inside the StoreProvider
export const useStore = (): StoreApi => {
  const api = use(StoreContext);
  if (!api) throw new Error("useStore must be used inside StoreProvider");
  return api;
};

// Whether the latest change is saved, and the undo it offers
export const useSyncStatus = (): SyncApi => use(SyncContext);
