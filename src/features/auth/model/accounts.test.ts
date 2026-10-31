import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerQueries, result, type QueryFn } from "@/test/db";

const db = vi.hoisted(() => ({ query: vi.fn<QueryFn>() }));

vi.mock("@/shared/api/db", () => ({ getPool: () => ({ query: db.query }), ensureSchema: () => Promise.resolve() }));

import { createAccount, passwordHashOf, setPasswordHash } from "./accounts";

describe("accounts", () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  it("creates an account with a sealed profile, or says the email is taken", async () => {
    answerQueries(db.query, [[/INSERT INTO users/u, () => result([{ id: "u1" }], 1)]]);
    await expect(createAccount("me@example.com", "hash", "Me")).resolves.toBe(true);
    const [, params] = db.query.mock.calls[0] ?? [];
    expect(params?.[0]).toMatch(/^[\da-f-]{36}$/u);
    expect(params?.[1]).toBe("me@example.com");
    expect(JSON.parse(String(params?.[2]))).toMatchObject({ name: "Me", image: null });
    answerQueries(db.query, [[/INSERT INTO users/u, () => result([], 0)]]);
    await expect(createAccount("me@example.com", "hash", null)).resolves.toBe(false);
  });

  it("reads and stores the password hash", async () => {
    answerQueries(db.query, [[/SELECT password_hash/u, () => [{ password_hash: "h1" }]]]);
    await expect(passwordHashOf("u1")).resolves.toBe("h1");
    answerQueries(db.query, [[/SELECT password_hash/u, () => []]]);
    await expect(passwordHashOf("u1")).resolves.toBeNull();
    await setPasswordHash("u1", "h2");
    expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining("UPDATE users SET password_hash"), ["u1", "h2"]);
  });
});
