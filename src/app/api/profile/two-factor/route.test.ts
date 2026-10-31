import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id?: string; email?: string | null } } | null>>(),
  beginTwoFactor: vi.fn<(userId: string, account: string) => Promise<{ secret: string; uri: string } | null>>(),
  confirmTwoFactor: vi.fn<(userId: string, code: string) => Promise<string[] | null>>(),
  disableTwoFactor: vi.fn<(userId: string, code: string) => Promise<boolean>>(),
}));

vi.mock("@/features/auth/model/auth", () => ({ auth: deps.auth }));
vi.mock("@/features/auth/model/twoFactor", () => ({
  beginTwoFactor: deps.beginTwoFactor,
  confirmTwoFactor: deps.confirmTwoFactor,
  disableTwoFactor: deps.disableTwoFactor,
}));

const { POST } = await import("./route");

// A two-factor step from an address
const step = (body: unknown, ip = "10.5.0.1") =>
  POST(request("/api/profile/two-factor", "POST", body, { "x-forwarded-for": ip }));

describe("POST /api/profile/two-factor", () => {
  beforeEach(() => {
    deps.auth.mockResolvedValue({ user: { id: "u1", email: "ann@example.com" } });
    deps.beginTwoFactor.mockResolvedValue({ secret: "BASE32", uri: "otpauth://totp/x" });
    deps.confirmTwoFactor.mockResolvedValue(["r1", "r2"]);
    deps.disableTwoFactor.mockResolvedValue(true);
  });

  it("starts, confirms and turns off two-factor sign-in", async () => {
    await expect(answerOf(await step({ action: "begin" }))).resolves.toEqual({
      status: 200,
      body: { secret: "BASE32", uri: "otpauth://totp/x" },
    });
    expect(deps.beginTwoFactor).toHaveBeenCalledWith("u1", "ann@example.com");
    await expect(answerOf(await step({ action: "confirm", code: "123456" }))).resolves.toEqual({
      status: 200,
      body: { recovery: ["r1", "r2"] },
    });
    expect(deps.confirmTwoFactor).toHaveBeenCalledWith("u1", "123456");
    expect((await step({ action: "disable", code: "123456" })).status).toBe(200);
  });

  it("names what went wrong", async () => {
    deps.beginTwoFactor.mockResolvedValue(null);
    deps.auth.mockResolvedValueOnce({ user: { id: "u1", email: null } });
    expect((await answerOf(await step({ action: "begin" }))).body).toEqual({ error: "enabled" });
    expect(deps.beginTwoFactor).toHaveBeenCalledWith("u1", "account");
    deps.confirmTwoFactor.mockResolvedValue(null);
    expect((await answerOf(await step({ action: "confirm" }))).body).toEqual({ error: "code" });
    deps.disableTwoFactor.mockResolvedValue(false);
    expect((await answerOf(await step({ action: "disable", code: "1" }))).body).toEqual({ error: "code" });
    expect((await answerOf(await step({ action: "other" }))).body).toEqual({ error: "action" });
  });

  it("needs an account and allows ten codes in 15 minutes", async () => {
    deps.auth.mockResolvedValueOnce(null);
    expect((await step({ action: "begin" })).status).toBe(401);
    const answers = await Promise.all(
      Array.from({ length: 11 }, () => step({ action: "confirm", code: "1" }, "10.5.0.2")),
    );
    expect(answers.at(-1)?.status).toBe(429);
  });
});
