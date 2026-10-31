import { beforeEach, describe, expect, it, vi } from "vitest";

const pg = vi.hoisted(() => ({
  options: [] as unknown[],
  query: vi.fn<(sql: string, params?: unknown[]) => Promise<unknown>>(),
}));

vi.mock("pg", () => ({
  Pool: class {
    // Keeps the options to check them
    constructor(options: unknown) {
      pg.options.push(options);
    }

    // Runs a statement
    query(sql: string, params?: unknown[]) {
      return pg.query(sql, params);
    }
  },
}));

const { Pool } = await import("pg");
const { errorText, logError } = await import("./errorLog");

describe("errorLog", () => {
  beforeEach(() => {
    globalThis.financeDb = undefined;
    pg.options.length = 0;
    pg.query.mockReset().mockResolvedValue({ rows: [] });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("puts an error on one short line", () => {
    expect(errorText(new TypeError("bad\n  thing"))).toBe("TypeError: bad thing");
    expect(errorText("plain")).toBe("plain");
    expect(errorText(new Error("x".repeat(600)))).toHaveLength(500);
  });

  it("only logs without a database", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await logError("route", new Error("boom"));
    expect(pg.query).not.toHaveBeenCalled();
  });

  it("keeps the latest errors through the app's pool", async () => {
    globalThis.financeDb = { pool: new Pool() };
    pg.options.length = 0;
    await logError("r".repeat(300), new Error("boom"), "digest-1");
    expect(pg.query).toHaveBeenNthCalledWith(1, expect.stringContaining("INSERT INTO app_errors"), [
      "r".repeat(200),
      "Error: boom",
      "digest-1",
    ]);
    expect(pg.query).toHaveBeenNthCalledWith(2, expect.stringContaining("DELETE FROM app_errors"), [200]);
    expect(pg.options).toEqual([]);
  });

  it("opens one small pool of its own and never throws", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost/finance");
    pg.query.mockRejectedValue(new Error("down"));
    await expect(logError("route", "offline")).resolves.toBeUndefined();
    await logError("route", "offline");
    expect(pg.options).toEqual([{ connectionString: "postgres://localhost/finance", max: 1 }]);
    expect(pg.query).toHaveBeenCalledWith(expect.any(String), ["route", "offline", null]);
  });
});
