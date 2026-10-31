import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearOutbox, readOutbox, writeOutbox, type Outbox } from "./outbox";

type Failure = "open" | "blocked" | "throw" | "transaction" | "abort" | null;

// What the fake database should go wrong with next
let failure: Failure = null;

// The fake's stores, kept between openings like a real browser database
const stores = new Map<string, Map<string, unknown>>();

// A request whose result is ready once its event fires
class FakeRequest<T> extends EventTarget {
  result: T;

  // Starts with the result it will report
  constructor(result: T) {
    super();
    this.result = result;
  }
}

// A transaction that completes or aborts after the current task
class FakeTransaction extends EventTarget {
  readonly data: Map<string, unknown>;

  // Settles on the next tick, the way a browser does
  constructor(data: Map<string, unknown>) {
    super();
    this.data = data;
    setTimeout(() => this.dispatchEvent(new Event(failure === "abort" ? "abort" : "complete")));
  }

  // The one store, with the calls the outbox uses
  objectStore() {
    const { data } = this;
    return {
      put: (value: unknown, key: string) => (data.set(key, value), new FakeRequest(key)),
      get: (key: string) => new FakeRequest(data.get(key)),
      delete: (key: string) => (data.delete(key), new FakeRequest(undefined)),
    };
  }
}

// A database that makes its store on the first opening
const fakeDb = () => ({
  closed: false,
  // Makes an empty store
  createObjectStore(name: string) {
    stores.set(name, new Map());
  },
  // Starts a transaction on a store, unless told to fail
  transaction(name: string) {
    if (failure === "transaction") throw new Error("closing");
    return new FakeTransaction(stores.get(name) ?? new Map());
  },
  // Marks the database closed
  close() {
    this.closed = true;
  },
});

// The fake indexedDB the outbox opens
const fakeIndexedDb = {
  // Opens the database on the next tick, or fails as told
  open() {
    if (failure === "throw") throw new Error("denied");
    const request = new FakeRequest(fakeDb());
    setTimeout(() => {
      if (failure === "open" || failure === "blocked") {
        request.dispatchEvent(new Event(failure === "open" ? "error" : "blocked"));
        return;
      }
      if (!stores.has("outbox")) request.dispatchEvent(new Event("upgradeneeded"));
      request.dispatchEvent(new Event("success"));
    });
    return request;
  },
};

const ENTRY: Outbox = { account: "u1", changes: { settings: undefined }, at: 1 };

describe("outbox", () => {
  beforeEach(() => {
    failure = null;
    stores.clear();
    vi.stubGlobal("indexedDB", fakeIndexedDb);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps unsent changes until they are cleared", async () => {
    await expect(readOutbox()).resolves.toBeNull();
    await writeOutbox(ENTRY);
    await expect(readOutbox()).resolves.toEqual(ENTRY);
    await clearOutbox();
    await expect(readOutbox()).resolves.toBeNull();
  });

  it("ignores a stored value that is not an entry", async () => {
    await writeOutbox(ENTRY);
    stores.get("outbox")?.set("pending", { account: 1 });
    await expect(readOutbox()).resolves.toBeNull();
  });

  it.each<Failure>(["open", "blocked", "throw", "transaction", "abort"])(
    "gives nothing back when the database fails (%s)",
    async (kind) => {
      await writeOutbox(ENTRY);
      failure = kind;
      await expect(readOutbox()).resolves.toBeNull();
      await expect(writeOutbox(ENTRY)).resolves.toBeUndefined();
    },
  );

  it("gives nothing back without a browser database", async () => {
    vi.unstubAllGlobals();
    await expect(readOutbox()).resolves.toBeNull();
  });
});
