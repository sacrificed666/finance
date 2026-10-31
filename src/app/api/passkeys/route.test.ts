import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({
  currentUserId: vi.fn<() => Promise<string | null>>(),
  listPasskeys: vi.fn<(userId: string) => Promise<object[]>>(),
  finishRegistration: vi.fn<(userId: string, response: unknown, name: string) => Promise<boolean>>(),
  removePasskey: vi.fn<(userId: string, id: string) => Promise<void>>(),
}));

vi.mock("@/features/auth/model/currentUser", () => ({ currentUserId: deps.currentUserId }));
vi.mock("@/features/auth/model/passkeys", () => ({
  listPasskeys: deps.listPasskeys,
  finishRegistration: deps.finishRegistration,
  removePasskey: deps.removePasskey,
}));

const { DELETE, GET, POST } = await import("./route");

const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

describe("/api/passkeys", () => {
  beforeEach(() => {
    deps.currentUserId.mockResolvedValue("u1");
    deps.listPasskeys.mockResolvedValue([{ id: "p1" }]);
    deps.finishRegistration.mockReset().mockResolvedValue(true);
  });

  it("lists the account's passkeys", async () => {
    await expect(answerOf(await GET())).resolves.toEqual({ status: 200, body: { passkeys: [{ id: "p1" }] } });
  });

  it("adds a passkey named after the device", async () => {
    const add = await POST(request("/api/passkeys", "POST", { response: { id: "cred" } }, { "user-agent": MAC }));
    await expect(answerOf(add)).resolves.toEqual({ status: 200, body: { passkeys: [{ id: "p1" }] } });
    expect(deps.finishRegistration).toHaveBeenCalledWith("u1", { id: "cred" }, expect.stringMatching(/Safari|macOS/u));
    deps.finishRegistration.mockResolvedValue(false);
    expect((await answerOf(await POST(request("/api/passkeys", "POST", { response: {} })))).body).toEqual({
      error: "verify",
    });
    expect((await answerOf(await POST(request("/api/passkeys", "POST", { response: "x" })))).body).toEqual({
      error: "response",
    });
  });

  it("removes a passkey", async () => {
    expect((await DELETE(request("/api/passkeys", "DELETE", { id: "p1" }))).status).toBe(200);
    expect(deps.removePasskey).toHaveBeenCalledWith("u1", "p1");
    expect((await DELETE(request("/api/passkeys", "DELETE", {}))).status).toBe(400);
  });

  it("needs an account", async () => {
    deps.currentUserId.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await POST(request("/api/passkeys", "POST", { response: {} }))).status).toBe(401);
    expect((await DELETE(request("/api/passkeys", "DELETE", { id: "p1" }))).status).toBe(401);
  });
});
