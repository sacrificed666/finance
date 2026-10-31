import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { answerQueries, type QueryFn } from "@/test/db";

const db = vi.hoisted(() => ({
  query: vi.fn<QueryFn>(),
  rows: [] as Array<{ id: string; at: string; secret: string }>,
}));
const push = vi.hoisted(() => ({ pushTo: vi.fn<(userId: string, message: { body: string }) => Promise<unknown>>() }));
const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("@/shared/api/db", () => ({ getPool: () => ({ query: db.query }), ensureSchema: () => Promise.resolve() }));
vi.mock("@/features/notifications/model/push", () => push);
vi.mock("next/headers", () => ({ headers: () => Promise.resolve(request.headers) }));

import { noteSignIn, recentSignIns } from "./signIns";

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

describe("signIns", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: Date.parse("2026-10-18T12:00:00Z"), toFake: ["Date"] });
    db.rows = [];
    push.pushTo.mockReset().mockResolvedValue({});
    request.headers = new Headers({ "user-agent": CHROME, "x-forwarded-for": "203.0.113.7" });
    answerQueries(db.query, [
      [/SELECT id::text AS id/u, () => [...db.rows].toReversed()],
      [
        /INSERT INTO sign_ins/u,
        (params) => {
          const id = String(db.rows.length + 1);
          db.rows.push({ id, at: new Date().toISOString(), secret: String(params[1]) });
          return [{ id }];
        },
      ],
      [/SELECT locale FROM settings/u, () => [{ locale: "uk" }]],
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records a sign-in with the device and address, and lists it", async () => {
    await expect(noteSignIn("u1", "password")).resolves.toBe("1");
    const [entry] = await recentSignIns("u1");
    expect(entry).toMatchObject({ id: "1", method: "password", device: "Chrome · Windows", ip: "203.0.113.7" });
    expect(push.pushTo).not.toHaveBeenCalled();
  });

  it("warns the account's devices about a sign-in from a new one", async () => {
    await noteSignIn("u1", "password");
    request.headers = new Headers({
      "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) Safari/604.1",
    });
    await noteSignIn("u1", "passkey");
    await vi.waitFor(() => {
      expect(push.pushTo).toHaveBeenCalledOnce();
    });
    expect(push.pushTo.mock.calls[0]?.[1].body).toContain("Safari · iPhone");
    await noteSignIn("u1", "passkey");
    expect(push.pushTo).toHaveBeenCalledOnce();
  });

  it("skips broken records and survives a failing database", async () => {
    db.rows.push({ id: "9", at: "2026-10-01T00:00:00Z", secret: JSON.stringify({ method: "fax" }) });
    await expect(recentSignIns("u1")).resolves.toEqual([]);
    db.query.mockRejectedValue(new Error("down"));
    await expect(noteSignIn("u1", "google")).resolves.toBeUndefined();
  });
});
