import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProfilePatch } from "@/features/profile/model/profileFields";
import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({
  currentUserId: vi.fn<() => Promise<string | null>>(),
  loadProfile: vi.fn<(userId: string) => Promise<object | null>>(),
  saveProfile: vi.fn<(userId: string, patch: ProfilePatch) => Promise<void>>(),
  logError: vi.fn<(route: string, error: unknown) => Promise<void>>(),
}));

vi.mock("@/features/auth/model/currentUser", () => ({ currentUserId: deps.currentUserId }));
vi.mock("@/features/profile/api/profileRepo", () => ({ loadProfile: deps.loadProfile, saveProfile: deps.saveProfile }));
vi.mock("@/features/settings/api/errorLog", () => ({ logError: deps.logError }));

const { GET, PATCH } = await import("./route");

// A profile change
const patch = (body: unknown) => PATCH(request("/api/profile", "PATCH", body));

describe("/api/profile", () => {
  beforeEach(() => {
    deps.currentUserId.mockResolvedValue("u1");
    deps.loadProfile.mockResolvedValue({ id: "u1", name: "Ann" });
    deps.saveProfile.mockReset().mockResolvedValue();
  });

  it("gives the profile", async () => {
    await expect(answerOf(await GET())).resolves.toEqual({ status: 200, body: { id: "u1", name: "Ann" } });
    deps.loadProfile.mockResolvedValue(null);
    expect((await GET()).status).toBe(404);
  });

  it("saves the changed fields and gives the profile back", async () => {
    await expect(answerOf(await patch({ name: "Anna" }))).resolves.toMatchObject({ status: 200, body: { id: "u1" } });
    expect(deps.saveProfile).toHaveBeenCalledWith("u1", expect.objectContaining({ name: "Anna" }));
  });

  it("refuses broken bodies and bad fields, and logs failed saves", async () => {
    expect((await patch("{")).status).toBe(400);
    expect((await patch({ website: "javascript:alert(1)" })).status).toBe(400);
    deps.saveProfile.mockRejectedValue(new Error("db down"));
    await expect(answerOf(await patch({ name: "Anna" }))).resolves.toEqual({
      status: 500,
      body: { error: "profile.saveFailed" },
    });
    expect(deps.logError).toHaveBeenCalledWith("api/profile", expect.any(Error));
  });

  it("needs an account", async () => {
    deps.currentUserId.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await patch({ name: "Anna" })).status).toBe(401);
  });
});
