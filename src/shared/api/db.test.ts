import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pg = vi.hoisted(() => ({
  options: [] as unknown[],
  query: vi.fn<(sql: string) => Promise<unknown>>(),
  release: vi.fn<() => void>(),
}));

vi.mock("pg", () => ({
  Pool: class {
    // Keeps the options and answers queries and connections with the mocks
    constructor(options: unknown) {
      pg.options.push(options);
    }

    // Runs a statement
    query(sql: string) {
      return pg.query(sql);
    }

    // A client for a transaction
    connect() {
      return Promise.resolve({ query: pg.query, release: pg.release });
    }
  },
}));

vi.mock("node:fs/promises", () => ({ readFile: () => Promise.resolve("CREATE TABLE t ();") }));

// The module with a fresh cache, as a new server would load it
const load = async () => {
  vi.resetModules();
  globalThis.financeDb = undefined;
  return import("./db");
};

describe("db", () => {
  beforeEach(() => {
    pg.options.length = 0;
    pg.query.mockReset().mockResolvedValue({ rows: [] });
    pg.release.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("needs DATABASE_URL and keeps one pool", async () => {
    const db = await load();
    vi.stubEnv("DATABASE_URL", "");
    expect(() => db.getPool()).toThrow("DATABASE_URL is not set");
    vi.stubEnv("DATABASE_URL", "postgres://test");
    expect(db.getPool()).toBe(db.getPool());
    expect(pg.options).toEqual([expect.objectContaining({ connectionString: "postgres://test", max: 10 })]);
  });

  it("applies the schema once and tries again after a failure", async () => {
    const db = await load();
    vi.stubEnv("DATABASE_URL", "postgres://test");
    pg.query.mockRejectedValueOnce(new Error("down"));
    await expect(db.ensureSchema()).rejects.toThrow("down");
    await db.ensureSchema();
    await db.ensureSchema();
    expect(pg.query).toHaveBeenCalledTimes(2);
  });

  it("commits a transaction that works and rolls back one that throws", async () => {
    const db = await load();
    vi.stubEnv("DATABASE_URL", "postgres://test");
    await expect(db.withTransaction(() => Promise.resolve(7))).resolves.toBe(7);
    await expect(db.withTransaction(() => Promise.reject(new Error("broken")))).rejects.toThrow("broken");
    expect(pg.query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN", "COMMIT", "BEGIN", "ROLLBACK"]);
    expect(pg.release).toHaveBeenCalledTimes(2);
  });
});
