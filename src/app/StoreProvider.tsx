"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type StoreApi, StoreContext, type SyncApi, SyncContext, type SyncStatus } from "@/app/store";
import { applyChanges, changeSize, diffState, isEmptyChange, type StateChanges } from "@/features/data/model/changes";
import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { normalizeState } from "@/features/data/model/normalize";
import { clearOutbox, readOutbox, writeOutbox } from "@/features/data/model/outbox";
import type { AppState } from "@/features/data/model/types";
import { THEME_COOKIE, yearCookie } from "@/features/settings/model/preferences";
import { materializeRecurring, rememberSkipped } from "@/features/transactions/model/schedules";
import { crossfade } from "@/shared/lib/crossfade";
import { isRecord, readString } from "@/shared/lib/guards";
import { AUTH_PATHS, signInHref } from "@/shared/lib/navigation";

const STATE_ENDPOINT = "/api/state";
// A failed save is tried again after this long
const RETRY_MS = 5000;
// Edits are saved this long after the last one
const SAVE_DELAY_MS = 500;

interface LoadedState {
  state: AppState;
  revision: string;
  account: string;
}

// The revision inside an ETag header
const unquote = (etag: string | null): string => (etag ?? "").replace(/^W\//u, "").replace(/^"(.*)"$/u, "$1");

// Sends a lost session to the sign-in page, which brings it back here
const toSignIn = () => {
  const { pathname, search } = window.location;
  if (!AUTH_PATHS.has(pathname)) window.location.href = signInHref(`${pathname}${search}`);
};

// The account's data from the server; a lost session goes to the sign-in page
const fetchState = async (): Promise<LoadedState> => {
  const response = await fetch(STATE_ENDPOINT, { cache: "no-store" });
  if (response.status === 401) {
    toSignIn();
    throw new Error("Signed out.");
  }
  if (!response.ok) {
    const detail: unknown = await response.json().catch(() => null);
    throw new Error(readString(detail, "error") ?? `Server responded with ${String(response.status)}`);
  }
  const revision = unquote(response.headers.get("etag"));
  const state = normalizeState(await response.json());
  return { state, revision, account: response.headers.get("x-account") ?? "" };
};

// Loads the account, saves each change as a change set, merges other devices
const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncStatus>("idle");
  const [undoLabel, setUndoLabel] = useState<string | null>(null);
  const [restored, setRestored] = useState(0);
  const account = useRef("");
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedFromServer = useRef(false);
  const revision = useRef("");
  const stateRef = useRef(state);
  const savedRef = useRef<AppState | null>(null);
  const busyRef = useRef(false);
  const resaveRef = useRef(false);
  const undoRef = useRef<StateChanges | null>(null);
  const saveRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Makes a state the current one at once, for timers and the next change
  const commit = useCallback((next: AppState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  // Loads the data and lays edits the server never got over it
  const load = useCallback(async () => {
    try {
      const loaded = await fetchState();
      loadedFromServer.current = true;
      revision.current = loaded.revision;
      account.current = loaded.account;
      savedRef.current = loaded.state;
      const fresh = materializeRecurring(loaded.state);
      const outbox = await readOutbox();
      if (outbox && outbox.account === loaded.account && !isEmptyChange(outbox.changes)) {
        const withOutbox = materializeRecurring(applyChanges(loaded.state, outbox.changes));
        undoRef.current = diffState(withOutbox, fresh);
        setRestored(changeSize(outbox.changes));
        commit(withOutbox);
      } else {
        if (outbox) void clearOutbox();
        commit(fresh);
      }
      setLoadError(null);
      setSync("idle");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not reach the database");
    } finally {
      setHydrated(true);
    }
  }, [commit]);

  // Pulls what another device saved and keeps this tab's unsaved edits on top
  const catchUp = useCallback(async () => {
    const fresh = await fetchState();
    const pending = savedRef.current ? diffState(savedRef.current, stateRef.current) : {};
    savedRef.current = fresh.state;
    revision.current = fresh.revision;
    commit(materializeRecurring(applyChanges(fresh.state, pending)));
  }, [commit]);

  // Sends the changes since the last save; a failure or lost session keeps them
  const save = useCallback(async (): Promise<void> => {
    if (busyRef.current) {
      resaveRef.current = true;
      return;
    }
    const base = savedRef.current;
    if (!base) return;
    const target = stateRef.current;
    const changes = diffState(base, target);
    if (isEmptyChange(changes)) {
      setSync("idle");
      void clearOutbox();
      return;
    }
    busyRef.current = true;
    setSync("saving");
    let failed = false;
    let signedOut = false;
    try {
      const response = await fetch(STATE_ENDPOINT, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base: revision.current, changes }),
      });
      signedOut = response.status === 401;
      if (!response.ok) throw new Error(`Server responded with ${String(response.status)}`);
      const result: unknown = await response.json();
      revision.current = readString(result, "revision") ?? revision.current;
      savedRef.current = target;
      if (isRecord(result) && result.stale === true) await catchUp().catch(() => {});
    } catch {
      failed = true;
    } finally {
      busyRef.current = false;
    }
    if (failed) {
      if (account.current) {
        void writeOutbox({ account: account.current, changes: diffState(base, stateRef.current), at: Date.now() });
      }
      setSync("error");
      // A lost session cannot be retried: the edits wait in the browser
      if (signedOut) {
        toSignIn();
        return;
      }
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => void saveRef.current(), RETRY_MS);
      return;
    }
    const more = resaveRef.current || stateRef.current !== target;
    resaveRef.current = false;
    if (more) {
      void saveRef.current();
    } else {
      setSync("idle");
      void clearOutbox();
    }
  }, [catchUp]);

  // The timers call the newest save
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const pathname = usePathname();
  const onAuthRoute = AUTH_PATHS.has(pathname);

  // The first load, once a signed-in page shows
  useEffect(() => {
    if (onAuthRoute || loadedFromServer.current) return;
    void load();
  }, [load, onAuthRoute]);

  // Saves half a second after the last edit, unless the state is the saved one
  useEffect(() => {
    if (!hydrated || !loadedFromServer.current || state === savedRef.current) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => void saveRef.current(), SAVE_DELAY_MS);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [state, hydrated]);

  // Coming back to the tab checks whether another device saved meanwhile
  useEffect(() => {
    if (!hydrated) return;
    // Pulls the newer data when the server's revision moved on, never mid-save
    const check = async () => {
      if (document.visibilityState !== "visible" || busyRef.current || !savedRef.current) return;
      busyRef.current = true;
      try {
        const response = await fetch(STATE_ENDPOINT, { method: "HEAD", cache: "no-store" });
        const latest = response.ok ? unquote(response.headers.get("etag")) : "";
        if (latest && latest !== revision.current) await catchUp();
      } catch {
        // Offline: the next visit to the tab tries again
      } finally {
        busyRef.current = false;
      }
      if (resaveRef.current) {
        resaveRef.current = false;
        void saveRef.current();
      }
    };
    // Starts the check without waiting for it
    const onReturn = () => {
      void check();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [hydrated, catchUp]);

  // Unsaved edits warn before leaving and are kept in the browser if the page goes
  useEffect(() => {
    if (sync === "idle") return;
    // Asks the browser to confirm leaving the page
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    // Stores the edits the server has not got yet
    const keep = () => {
      const base = savedRef.current;
      if (!base || !account.current) return;
      const changes = diffState(base, stateRef.current);
      if (!isEmptyChange(changes)) void writeOutbox({ account: account.current, changes, at: Date.now() });
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("pagehide", keep);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("pagehide", keep);
    };
  }, [sync]);

  // The account's theme, crossfaded in, and in a cookie for the next load
  const theme = state.settings.theme;
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (root.dataset.theme !== theme) {
      crossfade(() => {
        root.dataset.theme = theme;
      });
    }
    document.cookie = yearCookie(THEME_COOKIE, theme);
  }, [theme, hydrated]);

  // Marks a change as unsaved and keeps what takes it back for undo
  const markPending = useCallback((label: string | undefined, revert: StateChanges | null) => {
    if (loadedFromServer.current) setSync("saving");
    undoRef.current = label ? revert : null;
    setUndoLabel(label ?? null);
    setRestored(0);
  }, []);

  // Applies a change; undo later reverts only what it touched
  const apply = useCallback(
    (next: AppState, label?: string) => {
      const before = stateRef.current;
      markPending(label, label ? diffState(next, before) : null);
      commit(next);
    },
    [markPending, commit],
  );

  // A change the user made, with an undo toast; removed plans stay away
  const update = useCallback(
    (change: (current: AppState) => AppState, label?: string) => {
      const before = stateRef.current;
      apply(rememberSkipped(before, change(before)), label);
    },
    [apply],
  );

  // A change the app made by itself, which never offers an undo
  const quietUpdate = useCallback(
    (change: (current: AppState) => AppState) => {
      if (loadedFromServer.current) setSync("saving");
      const before = stateRef.current;
      commit(rememberSkipped(before, change(before)));
    },
    [commit],
  );

  // Replaces all data, as an import does
  const replace = useCallback(
    (next: AppState, label?: string) => apply(materializeRecurring(normalizeState(next)), label),
    [apply],
  );

  // Takes back the last change, keeping what other devices saved since
  const undo = useCallback(() => {
    const revert = undoRef.current;
    if (!revert) return;
    markPending(undefined, null);
    commit(applyChanges(stateRef.current, revert));
  }, [markPending, commit]);

  // Closes the undo toast
  const dismissUndo = useCallback(() => {
    undoRef.current = null;
    setUndoLabel(null);
    setRestored(0);
  }, []);

  const api = useMemo<StoreApi>(
    () => ({ state, hydrated, loadError, update, quietUpdate, replace, reload: load, undo, dismissUndo }),
    [state, hydrated, loadError, update, quietUpdate, replace, load, undo, dismissUndo],
  );
  const status = useMemo<SyncApi>(() => ({ sync, undoLabel, restored }), [sync, undoLabel, restored]);

  return (
    <StoreContext value={api}>
      <SyncContext value={status}>{children}</SyncContext>
    </StoreContext>
  );
};

export default StoreProvider;
