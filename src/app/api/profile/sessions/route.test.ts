import { describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  currentUserId: vi.fn<() => Promise<string | null>>(),
  endAllSessions: vi.fn<(userId: string) => Promise<void>>(),
}));

vi.mock("@/features/auth/model/currentUser", () => ({ currentUserId: deps.currentUserId }));
vi.mock("@/features/auth/model/sessions", () => ({ endAllSessions: deps.endAllSessions }));

const { DELETE } = await import("./route");

describe("DELETE /api/profile/sessions", () => {
  it("signs the account out everywhere", async () => {
    deps.currentUserId.mockResolvedValue("u1");
    expect((await DELETE()).status).toBe(200);
    expect(deps.endAllSessions).toHaveBeenCalledWith("u1");
  });

  it("needs an account", async () => {
    deps.currentUserId.mockResolvedValue(null);
    expect((await DELETE()).status).toBe(401);
  });
});
