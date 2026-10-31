import type { StateChanges } from "@/features/data/model/changes";
import { isRecord } from "@/shared/lib/guards";

const DB_NAME = "finance-tracker";
const STORE = "outbox";
const KEY = "pending";

export interface Outbox {
  account: string;
  changes: StateChanges;
  at: number;
}

// The browser database that keeps unsent changes, or null when it cannot open
const openDb = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.addEventListener("upgradeneeded", () => {
        request.result.createObjectStore(STORE);
      });
      request.addEventListener("success", () => {
        resolve(request.result);
      });
      request.addEventListener("error", () => {
        resolve(null);
      });
      request.addEventListener("blocked", () => {
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });

// One request on the outbox store, its result once the transaction completes
const run = async <T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> => {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    // Closes the database and answers
    const finish = (value: T | null) => {
      db.close();
      resolve(value);
    };
    try {
      const tx = db.transaction(STORE, mode);
      const request = work(tx.objectStore(STORE));
      tx.addEventListener("complete", () => {
        finish(request.result);
      });
      tx.addEventListener("error", () => {
        finish(null);
      });
      tx.addEventListener("abort", () => {
        finish(null);
      });
    } catch {
      finish(null);
    }
  });
};

// Whether a stored value is an outbox entry
const isOutbox = (value: unknown): value is Outbox =>
  isRecord(value) && typeof value.account === "string" && isRecord(value.changes);

// Keeps changes that could not be sent yet
export const writeOutbox = async (entry: Outbox): Promise<void> => {
  await run("readwrite", (store) => store.put(entry, KEY));
};

// The changes waiting to be sent, or null when there are none
export const readOutbox = async (): Promise<Outbox | null> => {
  const found: unknown = await run("readonly", (store) => store.get(KEY));
  return isOutbox(found) ? found : null;
};

// Forgets the waiting changes once they are saved
export const clearOutbox = async (): Promise<void> => {
  await run("readwrite", (store) => store.delete(KEY));
};
