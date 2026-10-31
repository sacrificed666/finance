import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({
  currentUserId: vi.fn<() => Promise<string | null>>(),
  cachedQuotes: vi.fn<(now: number) => Promise<{ quotes: Map<string, { id: string }>; fetchedAt: number } | null>>(),
}));

vi.mock("@/features/auth/model/currentUser", () => ({ currentUserId: deps.currentUserId }));
vi.mock("@/features/investments/api/inzhurSite", () => ({ cachedQuotes: deps.cachedQuotes }));

const { GET } = await import("./route");

const FETCHED = Date.parse("2026-10-18T10:00:00Z");

// Quotes of these funds, as the cache keeps them
const quotes = (...ids: string[]) => ({ quotes: new Map(ids.map((id) => [id, { id }])), fetchedAt: FETCHED });

describe("GET /api/inzhur", () => {
  beforeEach(() => {
    deps.currentUserId.mockResolvedValue("u1");
    deps.cachedQuotes.mockResolvedValue(quotes("inzhur-reit", "inzhur-energy", "inzhur-miltech"));
  });

  it("gives every quote, or the ones asked for", async () => {
    await expect(answerOf(await GET(request("/api/inzhur", "GET")))).resolves.toEqual({
      status: 200,
      body: {
        quotes: [{ id: "inzhur-reit" }, { id: "inzhur-energy" }, { id: "inzhur-miltech" }],
        fetchedAt: "2026-10-18T10:00:00.000Z",
        partial: false,
      },
    });
    const picked = await answerOf(await GET(request("/api/inzhur?ids=inzhur-energy,%20,unknown", "GET")));
    expect(picked.body).toMatchObject({ quotes: [{ id: "inzhur-energy" }] });
  });

  it("says when some funds are missing", async () => {
    deps.cachedQuotes.mockResolvedValue(quotes("inzhur-reit"));
    expect((await answerOf(await GET(request("/api/inzhur", "GET")))).body).toMatchObject({ partial: true });
  });

  it("needs an account and a reachable site", async () => {
    deps.currentUserId.mockResolvedValueOnce(null);
    expect((await GET(request("/api/inzhur", "GET"))).status).toBe(401);
    deps.cachedQuotes.mockResolvedValue(null);
    expect((await GET(request("/api/inzhur", "GET"))).status).toBe(503);
  });
});
