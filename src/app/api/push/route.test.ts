import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({
  currentUserId: vi.fn<() => Promise<string | null>>(),
  saveDevice: vi.fn<(userId: string, subscription: unknown) => Promise<boolean>>(),
  removeDevice: vi.fn<(userId: string, endpoint: string) => Promise<void>>(),
}));

vi.mock("@/features/auth/model/currentUser", () => ({ currentUserId: deps.currentUserId }));
vi.mock("@/features/notifications/model/push", () => ({
  pushKey: () => "public-key",
  REMINDER_HOUR: 9,
  saveDevice: deps.saveDevice,
  removeDevice: deps.removeDevice,
}));

const { DELETE, GET, PUT } = await import("./route");

describe("/api/push", () => {
  beforeEach(() => {
    deps.currentUserId.mockResolvedValue("u1");
    deps.saveDevice.mockReset().mockResolvedValue(true);
  });

  it("gives the key devices subscribe with and the reminder hour", async () => {
    await expect(answerOf(await GET())).resolves.toEqual({ status: 200, body: { key: "public-key", hour: 9 } });
  });

  it("keeps a device and refuses a broken subscription", async () => {
    expect((await PUT(request("/api/push", "PUT", { subscription: { endpoint: "x" } }))).status).toBe(200);
    expect(deps.saveDevice).toHaveBeenCalledWith("u1", { endpoint: "x" });
    deps.saveDevice.mockResolvedValue(false);
    expect((await answerOf(await PUT(request("/api/push", "PUT", "{")))).body).toEqual({ error: "subscription" });
    expect(deps.saveDevice).toHaveBeenLastCalledWith("u1", null);
  });

  it("forgets a device", async () => {
    expect((await DELETE(request("/api/push", "DELETE", { endpoint: "https://push.example/1" }))).status).toBe(200);
    expect(deps.removeDevice).toHaveBeenCalledWith("u1", "https://push.example/1");
    expect((await DELETE(request("/api/push", "DELETE", {}))).status).toBe(400);
  });

  it("needs an account", async () => {
    deps.currentUserId.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await PUT(request("/api/push", "PUT", {}))).status).toBe(401);
    expect((await DELETE(request("/api/push", "DELETE", {}))).status).toBe(401);
  });
});
