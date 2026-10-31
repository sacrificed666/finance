import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StateChanges } from "@/features/data/model/changes";
import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { answerOf, request } from "@/test/http";

interface Session {
  user?: { id?: string; email?: string };
}

const deps = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<Session | null>>(),
  cookie: { value: "" },
  resealOlderRecords: vi.fn<(id: string) => Promise<number>>(),
  loadState: vi.fn<(id: string, locale: string) => Promise<{ state: AppState; revision: string }>>(),
  stateRevision: vi.fn<(id: string) => Promise<string>>(),
  saveChanges: vi.fn<(id: string, changes: StateChanges, base: string | null, locale: string) => Promise<object>>(),
  logError: vi.fn<(route: string, error: unknown) => Promise<void>>(),
}));

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: () => (deps.cookie.value === "" ? undefined : { value: deps.cookie.value }) }),
}));
vi.mock("@/features/auth/model/auth", () => ({ auth: deps.auth }));
vi.mock("@/features/data/api/repo", () => ({
  loadState: deps.loadState,
  saveChanges: deps.saveChanges,
  stateRevision: deps.stateRevision,
}));
vi.mock("@/features/data/api/reseal", () => ({ resealOlderRecords: deps.resealOlderRecords }));
vi.mock("@/features/settings/api/errorLog", () => ({ logError: deps.logError }));

const { GET, HEAD, PATCH } = await import("./route");

const CHANGES = { transactions: { upsert: [], remove: ["t1"] } };

describe("/api/state", () => {
  beforeEach(() => {
    for (const mock of [
      deps.auth,
      deps.resealOlderRecords,
      deps.loadState,
      deps.stateRevision,
      deps.saveChanges,
      deps.logError,
    ]) {
      mock.mockReset();
    }
    deps.cookie.value = "";
    deps.auth.mockResolvedValue({ user: { id: "u1", email: "me@example.com" } });
    deps.loadState.mockResolvedValue({ state: DEFAULT_STATE, revision: "rev-1" });
    deps.stateRevision.mockResolvedValue("rev-1");
    deps.saveChanges.mockResolvedValue({ revision: "rev-2", stale: false, written: 1 });
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("turns visitors away", async () => {
    deps.auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await HEAD()).status).toBe(401);
    expect((await PATCH(request("/api/state", "PATCH", { changes: CHANGES }))).status).toBe(401);
    expect(deps.loadState).not.toHaveBeenCalled();
  });

  it("gives the state with its revision in the cookie's language", async () => {
    deps.cookie.value = "uk";
    const response = await GET();
    expect(response.headers.get("ETag")).toBe('"rev-1"');
    expect(response.headers.get("X-Account")).toBe("u1");
    expect((await answerOf(response)).body).toEqual(DEFAULT_STATE);
    expect(deps.loadState).toHaveBeenCalledWith("u1", "uk");
    expect(deps.resealOlderRecords).toHaveBeenCalledWith("u1");
    deps.cookie.value = "xx";
    await GET();
    expect(deps.loadState).toHaveBeenLastCalledWith("u1", "en");
  });

  it("logs a failed load and answers without its details", async () => {
    const plain = { status: 500, body: { error: "The server could not reach your data. Try again in a moment." } };
    deps.loadState.mockRejectedValue(new Error("password authentication failed for user finance"));
    await expect(answerOf(await GET())).resolves.toEqual(plain);
    expect(deps.logError).toHaveBeenCalledWith("api/state", expect.any(Error));
    deps.loadState.mockRejectedValue("odd");
    await expect(answerOf(await GET())).resolves.toEqual(plain);
  });

  it("gives the revision alone", async () => {
    const response = await HEAD();
    expect(response.status).toBe(200);
    expect(response.headers.get("ETag")).toBe('"rev-1"');
    deps.stateRevision.mockRejectedValue(new Error("db down"));
    expect((await HEAD()).status).toBe(500);
    expect(deps.logError).toHaveBeenCalledOnce();
  });

  it("saves changes since a revision", async () => {
    deps.cookie.value = "de";
    const response = await PATCH(request("/api/state", "PATCH", { base: "rev-1", changes: CHANGES }));
    await expect(answerOf(response)).resolves.toEqual({
      status: 200,
      body: { revision: "rev-2", stale: false, written: 1 },
    });
    expect(response.headers.get("ETag")).toBe('"rev-2"');
    expect(deps.saveChanges).toHaveBeenCalledWith("u1", CHANGES, "rev-1", "de");
    await PATCH(request("/api/state", "PATCH", { base: "", changes: {} }));
    expect(deps.saveChanges).toHaveBeenLastCalledWith("u1", {}, null, "de");
  });

  it("refuses broken saves and logs failed ones", async () => {
    await expect(answerOf(await PATCH(request("/api/state", "PATCH", "{")))).resolves.toEqual({
      status: 400,
      body: { error: "Body must be valid JSON" },
    });
    expect((await PATCH(request("/api/state", "PATCH", { changes: { transactions: { upsert: "x" } } }))).status).toBe(
      400,
    );
    expect((await PATCH(request("/api/state", "PATCH", ["changes"]))).status).toBe(400);
    deps.saveChanges.mockRejectedValue(new Error("conflict"));
    expect((await PATCH(request("/api/state", "PATCH", { changes: CHANGES }))).status).toBe(500);
    expect(deps.logError).toHaveBeenCalledOnce();
  });
});
