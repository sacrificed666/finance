import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { answerQueries, type QueryFn } from "@/test/db";

const db = vi.hoisted(() => ({ query: vi.fn<QueryFn>() }));

vi.mock("@/shared/api/db", () => ({ getPool: () => ({ query: db.query }), ensureSchema: () => Promise.resolve() }));

import { endAllSessions, endOtherSessions, sessionState } from "./sessions";

describe("sessions", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 1_000_000, toFake: ["Date"] });
    db.query.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads the epoch once and keeps it for half a minute", async () => {
    answerQueries(db.query, [[/SELECT session_epoch/u, () => [{ session_epoch: 3, epoch_keeper: "s1" }]]]);
    await expect(sessionState("user-a")).resolves.toEqual({ epoch: 3, keeper: "s1" });
    await expect(sessionState("user-a")).resolves.toEqual({ epoch: 3, keeper: "s1" });
    expect(db.query).toHaveBeenCalledOnce();
    vi.setSystemTime(1_000_000 + 31_000);
    answerQueries(db.query, [[/SELECT session_epoch/u, () => [{ session_epoch: null }]]]);
    await expect(sessionState("user-a")).resolves.toEqual({ epoch: 0, keeper: null });
  });

  it("has no epoch for an account that is gone, so its tokens are signed out", async () => {
    answerQueries(db.query, [[/SELECT session_epoch/u, () => []]]);
    await expect(sessionState("user-gone")).resolves.toBeNull();
  });

  it("moves the epoch on to sign out everywhere", async () => {
    answerQueries(db.query, [[/UPDATE users SET session_epoch/u, () => [{ session_epoch: 4 }]]]);
    await endAllSessions("user-b");
    await expect(sessionState("user-b")).resolves.toEqual({ epoch: 4, keeper: null });
    expect(db.query).toHaveBeenCalledOnce();
  });

  it("keeps the session that asked when it signs the others out", async () => {
    answerQueries(db.query, [
      [/UPDATE users SET session_epoch/u, (params) => [{ session_epoch: 5, epoch_keeper: params[1] }]],
    ]);
    await endOtherSessions("user-c", "sign-in-9");
    await expect(sessionState("user-c")).resolves.toEqual({ epoch: 5, keeper: "sign-in-9" });
    answerQueries(db.query, [[/UPDATE users SET session_epoch/u, () => []]]);
    await endOtherSessions("user-gone", null);
    await expect(sessionState("user-gone")).resolves.toBeNull();
  });
});
