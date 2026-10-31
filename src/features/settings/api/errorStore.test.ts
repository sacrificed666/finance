import { describe, expect, it, vi } from "vitest";

import { answerQueries, type QueryFn } from "@/test/db";

const db = vi.hoisted(() => ({ query: vi.fn<QueryFn>() }));

vi.mock("@/shared/api/db", () => ({ getPool: () => ({ query: db.query }), ensureSchema: () => Promise.resolve() }));

const { clearErrors, recentErrors } = await import("./errorStore");

describe("errorStore", () => {
  it("lists the latest errors with the count and clears them", async () => {
    const error = { at: "2026-10-18T10:00:00Z", route: "api/state", message: "Error: boom" };
    answerQueries(db.query, [
      [/count\(\*\)/u, () => [{ n: "42" }]],
      [/FROM app_errors ORDER BY/u, () => [error]],
    ]);
    await expect(recentErrors()).resolves.toEqual({ errors: [error], total: 42 });
    await clearErrors();
    expect(db.query).toHaveBeenLastCalledWith("DELETE FROM app_errors");
  });

  it("counts none when the table is empty", async () => {
    answerQueries(db.query, []);
    await expect(recentErrors()).resolves.toEqual({ errors: [], total: 0 });
  });
});
