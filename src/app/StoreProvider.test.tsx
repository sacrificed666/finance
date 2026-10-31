import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { Outbox } from "@/features/data/model/outbox";
import type { AppState, Transaction } from "@/features/data/model/types";

import { useStore, useSyncStatus } from "./hooks";
import type { StoreApi, SyncApi } from "./store";
import StoreProvider from "./StoreProvider";

const nav = vi.hoisted(() => ({ pathname: "/" }));
const outbox = vi.hoisted(() => ({
  readOutbox: vi.fn<() => Promise<Outbox | null>>(),
  writeOutbox: vi.fn<(entry: Outbox) => Promise<void>>(),
  clearOutbox: vi.fn<() => Promise<void>>(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("@/features/data/model/outbox", () => outbox);

// An expense on a day
const expense = (id: string, amount = 100): Transaction => ({
  id,
  type: "expense",
  amount,
  currency: "UAH",
  categoryId: "food",
  date: "2026-10-01",
});

// A fake server that keeps one account's state and its revision
const server = {
  state: DEFAULT_STATE,
  revision: "r1",
  loadStatus: 200,
  patchStatus: 200,
  stale: false,
  patches: [] as unknown[],
};

// Answers the store's calls the way /api/state does
const answer = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const method = init?.method ?? "GET";
  if (method === "HEAD") return new Response(null, { headers: { ETag: `"${server.revision}"` } });
  if (method === "PATCH") {
    if (server.patchStatus !== 200) return new Response(null, { status: server.patchStatus });
    const body: unknown = JSON.parse(typeof init?.body === "string" ? init.body : "{}");
    server.patches.push(body);
    server.revision = `r${String(server.patches.length + 1)}`;
    const stale = server.stale;
    server.stale = false;
    return Response.json({ revision: server.revision, stale, written: 1 });
  }
  if (server.loadStatus !== 200) return Response.json({ error: "db down" }, { status: server.loadStatus });
  return Response.json(server.state, { headers: { ETag: `W/"${server.revision}"`, "X-Account": "u1" } });
};

const fetchMock = vi.fn<typeof answer>(answer);

// What the store gave its children last
const seen: { api: StoreApi | null; sync: SyncApi | null } = { api: null, sync: null };

// Keeps what the store gives so the test can call it
const remember = (api: StoreApi, sync: SyncApi) => {
  seen.api = api;
  seen.sync = sync;
};

// Shows the store's status and reports it to the test after each render
const Probe = ({ onSeen }: { onSeen: (api: StoreApi, sync: SyncApi) => void }) => {
  const api = useStore();
  const sync = useSyncStatus();
  useEffect(() => onSeen(api, sync));
  return (
    <p>
      {api.hydrated ? "ready" : "loading"} {sync.sync} {api.loadError ?? "fine"} {api.state.transactions.length}
    </p>
  );
};

// The store as the test last saw it
const store = (): StoreApi => {
  if (!seen.api) throw new Error("The store has not rendered");
  return seen.api;
};

// Renders the store and waits for its first load
const mount = async () => {
  const view = render(
    <StoreProvider>
      <Probe onSeen={remember} />
    </StoreProvider>,
  );
  await waitFor(() => expect(store().hydrated).toBe(true));
  return view;
};

// Adds an entry the way a form does
const addEntry = (tx: Transaction, label?: string) =>
  act(() => store().update((state: AppState) => ({ ...state, transactions: [...state.transactions, tx] }), label));

describe("StoreProvider", () => {
  beforeEach(() => {
    Object.assign(server, {
      state: DEFAULT_STATE,
      revision: "r1",
      loadStatus: 200,
      patchStatus: 200,
      stale: false,
      patches: [],
    });
    nav.pathname = "/";
    seen.api = null;
    seen.sync = null;
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    outbox.readOutbox.mockReset().mockResolvedValue(null);
    outbox.writeOutbox.mockReset().mockResolvedValue();
    outbox.clearOutbox.mockReset().mockResolvedValue();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete document.documentElement.dataset.theme;
  });

  it("loads the account and puts its theme on the page", async () => {
    server.state = {
      ...DEFAULT_STATE,
      settings: { ...DEFAULT_STATE.settings, theme: "dark" },
      transactions: [expense("t1")],
    };
    await mount();
    expect(screen.getByText(/ready idle fine 1/u)).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.cookie).toContain("finance-theme=dark");
    expect(fetchMock).toHaveBeenCalledWith("/api/state", { cache: "no-store" });
  });

  it("waits on the sign-in pages", () => {
    nav.pathname = "/login";
    render(
      <StoreProvider>
        <Probe onSeen={remember} />
      </StoreProvider>,
    );
    expect(store().hydrated).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("names a failed load and loads again on request", async () => {
    server.loadStatus = 500;
    await mount();
    expect(store().loadError).toBe("db down");
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 503 }));
    await act(() => store().reload());
    expect(store().loadError).toBe("Server responded with 503");
    fetchMock.mockRejectedValueOnce("offline");
    await act(() => store().reload());
    expect(store().loadError).toBe("Could not reach the database");
    server.loadStatus = 200;
    await act(() => store().reload());
    expect(store().loadError).toBeNull();
  });

  it("sends a lost session to the sign-in page", async () => {
    const jsdomError = vi.spyOn(console, "error").mockImplementation(() => {});
    server.loadStatus = 401;
    await mount();
    expect(store().loadError).toBe("Signed out.");
    jsdomError.mockRestore();
  });

  it("saves each edit as changes since the revision and offers an undo", async () => {
    await mount();
    addEntry(expense("t1"), "Added");
    expect(seen.sync).toMatchObject({ sync: "saving", undoLabel: "Added" });
    await waitFor(() => expect(seen.sync?.sync).toBe("idle"));
    expect(server.patches).toEqual([
      { base: "r1", changes: { transactions: { upsert: [expense("t1")], remove: [] } } },
    ]);
    expect(outbox.clearOutbox).toHaveBeenCalled();

    act(() => store().undo());
    expect(store().state.transactions).toEqual([]);
    await waitFor(() => expect(server.patches).toHaveLength(2));
    expect(server.patches[1]).toEqual({ base: "r2", changes: { transactions: { upsert: [], remove: ["t1"] } } });
    act(() => store().undo());
    act(() => store().dismissUndo());
    expect(seen.sync?.undoLabel).toBeNull();
  });

  it("saves app changes and whole imports too", async () => {
    await mount();
    act(() => store().quietUpdate((state) => ({ ...state, transactions: [expense("auto")] })));
    await waitFor(() => expect(server.patches).toHaveLength(1));
    act(() => store().replace({ ...DEFAULT_STATE, transactions: [expense("imported")] }, "Imported"));
    expect(seen.sync?.undoLabel).toBe("Imported");
    await waitFor(() => expect(server.patches).toHaveLength(2));
    expect(store().state.transactions.map((tx) => tx.id)).toEqual(["imported"]);
  });

  it("keeps a failed save in the browser and tries again", async () => {
    await mount();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    server.patchStatus = 500;
    addEntry(expense("t1"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
      await vi.waitFor(() => expect(outbox.writeOutbox).toHaveBeenCalled());
    });
    expect(seen.sync?.sync).toBe("error");
    expect(outbox.writeOutbox).toHaveBeenCalledWith(
      expect.objectContaining({ account: "u1", changes: { transactions: { upsert: [expense("t1")], remove: [] } } }),
    );
    server.patchStatus = 200;
    outbox.clearOutbox.mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
      await vi.waitFor(() => expect(outbox.clearOutbox).toHaveBeenCalled());
    });
    expect(seen.sync?.sync).toBe("idle");
    expect(server.patches).toHaveLength(1);
  });

  it("keeps edits for after the sign-in when the session is lost while saving", async () => {
    const jsdomError = vi.spyOn(console, "error").mockImplementation(() => {});
    await mount();
    server.patchStatus = 401;
    addEntry(expense("t1"));
    await waitFor(() => expect(outbox.writeOutbox).toHaveBeenCalled());
    expect(seen.sync?.sync).toBe("error");
    const calls = fetchMock.mock.calls.length;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(fetchMock.mock.calls).toHaveLength(calls);
    jsdomError.mockRestore();
  });

  it("merges what another device saved first and keeps this tab's edits", async () => {
    await mount();
    server.stale = true;
    const other = expense("other");
    fetchMock.mockImplementation(async (input, init) => {
      if ((init?.method ?? "GET") === "GET")
        server.state = { ...DEFAULT_STATE, transactions: [other, expense("mine")] };
      return answer(input, init);
    });
    addEntry(expense("mine"));
    await waitFor(() =>
      expect(
        store()
          .state.transactions.map((tx) => tx.id)
          .toSorted(),
      ).toEqual(["mine", "other"]),
    );
    fetchMock.mockImplementation(answer);
  });

  it("brings back edits the server never got", async () => {
    outbox.readOutbox.mockResolvedValue({
      account: "u1",
      changes: { transactions: { upsert: [expense("kept")], remove: [] } },
      at: 1,
    });
    await mount();
    expect(store().state.transactions.map((tx) => tx.id)).toEqual(["kept"]);
    expect(seen.sync?.restored).toBe(1);
    await waitFor(() => expect(server.patches).toHaveLength(1));
  });

  it("drops kept edits of another account", async () => {
    outbox.readOutbox.mockResolvedValue({
      account: "u2",
      changes: { transactions: { upsert: [expense("x")], remove: [] } },
      at: 1,
    });
    await mount();
    expect(store().state.transactions).toEqual([]);
    expect(outbox.clearOutbox).toHaveBeenCalled();
  });

  it("pulls newer data when the tab comes back", async () => {
    await mount();
    fireEvent.focus(window);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/state", { method: "HEAD", cache: "no-store" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    server.revision = "r9";
    server.state = { ...DEFAULT_STATE, transactions: [expense("elsewhere")] };
    fireEvent(document, new Event("visibilitychange"));
    await waitFor(() => expect(store().state.transactions.map((tx) => tx.id)).toEqual(["elsewhere"]));
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    fireEvent.focus(window);
    expect(store().state.transactions).toHaveLength(1);
  });

  it("undoes only its own change when another device saved meanwhile", async () => {
    await mount();
    addEntry(expense("mine"), "Added");
    await waitFor(() => expect(seen.sync?.sync).toBe("idle"));
    server.revision = "r9";
    server.state = { ...DEFAULT_STATE, transactions: [expense("mine"), expense("theirs")] };
    fireEvent(document, new Event("visibilitychange"));
    await waitFor(() => expect(store().state.transactions).toHaveLength(2));
    act(() => store().undo());
    expect(store().state.transactions.map((tx) => tx.id)).toEqual(["theirs"]);
  });

  it("lets a save wait while the tab pulls newer data", async () => {
    await mount();
    server.revision = "r5";
    const gate = Promise.withResolvers<void>();
    fetchMock.mockImplementation(async (input, init) => {
      if ((init?.method ?? "GET") === "GET") {
        await gate.promise;
        server.state = { ...DEFAULT_STATE, transactions: [expense("theirs")] };
      }
      return answer(input, init);
    });
    fireEvent.focus(window);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/state", { method: "HEAD", cache: "no-store" }));
    addEntry(expense("mine"));
    await act(() => new Promise((resolve) => setTimeout(resolve, 700)));
    expect(server.patches).toHaveLength(0);
    gate.resolve();
    await waitFor(() => expect(server.patches).toHaveLength(1));
    expect(server.patches[0]).toMatchObject({ base: "r5" });
    expect(
      store()
        .state.transactions.map((tx) => tx.id)
        .toSorted(),
    ).toEqual(["mine", "theirs"]);
    fetchMock.mockImplementation(answer);
  });

  it("warns before leaving with unsaved edits and keeps them when the page goes", async () => {
    await mount();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    addEntry(expense("t1"));
    const leaving = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(leaving);
    expect(leaving.defaultPrevented).toBe(true);
    window.dispatchEvent(new Event("pagehide"));
    expect(outbox.writeOutbox).toHaveBeenCalledWith(expect.objectContaining({ account: "u1" }));
  });
});
