import { describe, expect, it, vi } from "vitest";

import { answerOf } from "@/test/http";

const deps = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id?: string }; signInId?: string } | null>>(),
  recentSignIns: vi.fn<(userId: string) => Promise<object[]>>(),
}));

vi.mock("@/features/auth/model/auth", () => ({ auth: deps.auth }));
vi.mock("@/features/auth/model/signIns", () => ({ recentSignIns: deps.recentSignIns }));

const { GET } = await import("./route");

describe("GET /api/profile/sign-ins", () => {
  it("lists recent sign-ins and marks this one", async () => {
    deps.recentSignIns.mockResolvedValue([{ id: "s1" }]);
    deps.auth.mockResolvedValue({ user: { id: "u1" }, signInId: "s1" });
    await expect(answerOf(await GET())).resolves.toEqual({
      status: 200,
      body: { current: "s1", entries: [{ id: "s1" }] },
    });
    deps.auth.mockResolvedValue({ user: { id: "u1" } });
    expect((await answerOf(await GET())).body).toMatchObject({ current: null });
  });

  it("needs an account", async () => {
    deps.auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });
});
