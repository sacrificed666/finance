import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({ currentUserId: vi.fn<() => Promise<string | null>>() }));

vi.mock("@/features/auth/model/currentUser", () => ({ currentUserId: deps.currentUserId }));

const { GET } = await import("./route");

describe("GET /api/calendar", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "secret");
    deps.currentUserId.mockResolvedValue("u1");
  });

  it("gives the path of the account's calendar file for a link number", async () => {
    const answer = await answerOf(await GET(request("/api/calendar?feed=2", "GET")));
    expect(answer.status).toBe(200);
    expect(answer.body).toEqual({ path: expect.stringMatching(/^\/api\/calendar\/u1\/\d+\.[\w-]{32}\.ics$/u) });
  });

  it("asks for a session, a link number and a server secret", async () => {
    expect((await GET(request("/api/calendar?feed=0", "GET"))).status).toBe(400);
    deps.currentUserId.mockResolvedValueOnce(null);
    expect((await GET(request("/api/calendar?feed=1", "GET"))).status).toBe(401);
    vi.stubEnv("AUTH_SECRET", "");
    expect((await GET(request("/api/calendar?feed=1", "GET"))).status).toBe(503);
  });
});
