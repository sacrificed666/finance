import { describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ query: vi.fn<(sql: string) => Promise<unknown>>() }));

vi.mock("@/shared/api/db", () => ({ getPool: () => ({ query: db.query }) }));

const { GET } = await import("./route");

describe("GET /healthz", () => {
  it("answers ok without caching and without asking the database", async () => {
    const response = await GET(new Request("http://localhost/healthz"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("ok\n");
    expect(db.query).not.toHaveBeenCalled();
  });

  it("checks the database when asked", async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    expect((await GET(new Request("http://localhost/healthz?db=1"))).status).toBe(200);
    db.query.mockRejectedValueOnce(new Error("down"));
    const down = await GET(new Request("http://localhost/healthz?db=1"));
    expect(down.status).toBe(503);
    expect(await down.text()).toBe("database unreachable\n");
  });

  it("gives up on a database that does not answer in time", async () => {
    vi.useFakeTimers();
    db.query.mockReturnValueOnce(new Promise(() => {}));
    const pending = GET(new Request("http://localhost/healthz?db=1"));
    await vi.advanceTimersByTimeAsync(2000);
    expect((await pending).status).toBe(503);
    vi.useRealTimers();
  });
});
