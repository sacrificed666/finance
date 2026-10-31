import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({
  currentSession: vi.fn<() => Promise<{ id: string; signInId: string | null } | null>>(),
  endOtherSessions: vi.fn<(userId: string, keeper: string | null) => Promise<void>>(),
  passwordHashOf: vi.fn<(userId: string) => Promise<string | null>>(),
  setPasswordHash: vi.fn<(userId: string, hash: string) => Promise<void>>(),
}));

vi.mock("@/features/auth/model/currentUser", () => ({ currentSession: deps.currentSession }));
vi.mock("@/features/auth/model/sessions", () => ({ endOtherSessions: deps.endOtherSessions }));
vi.mock("@/features/auth/model/accounts", () => ({
  passwordHashOf: deps.passwordHashOf,
  setPasswordHash: deps.setPasswordHash,
}));
vi.mock("@/features/auth/model/password", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  hashPassword: (password: string) => Promise.resolve(`hash:${password}`),
  verifyPassword: (password: string, stored: string) => Promise.resolve(stored === `hash:${password}`),
}));

const { POST } = await import("./route");

// A password change from an address
const change = (body: unknown, ip = "10.4.0.1") =>
  POST(request("/api/profile/password", "POST", body, { "x-forwarded-for": ip }));

describe("POST /api/profile/password", () => {
  beforeEach(() => {
    deps.currentSession.mockResolvedValue({ id: "u1", signInId: "s7" });
    deps.endOtherSessions.mockReset();
    deps.passwordHashOf.mockResolvedValue("hash:old password 1");
    deps.setPasswordHash.mockReset();
  });

  it("sets a new password after the current one", async () => {
    await expect(answerOf(await change({ current: "old password 1", next: "new password 1" }))).resolves.toEqual({
      status: 200,
      body: { ok: true },
    });
    expect(deps.setPasswordHash).toHaveBeenCalledWith("u1", "hash:new password 1");
    expect(deps.endOtherSessions).toHaveBeenCalledWith("u1", "s7");
  });

  it("sets a first password without a current one", async () => {
    deps.passwordHashOf.mockResolvedValue(null);
    expect((await change({ next: "first password" })).status).toBe(200);
  });

  it("refuses a wrong current password, a weak one and a broken body", async () => {
    await expect(answerOf(await change({ current: "guess", next: "new password 1" }))).resolves.toEqual({
      status: 403,
      body: { error: "password.problem.current" },
    });
    expect((await answerOf(await change({ next: "short" }))).body).toEqual({ error: "password.problem.short" });
    expect((await change("{")).status).toBe(400);
    expect(deps.setPasswordHash).not.toHaveBeenCalled();
  });

  it("needs an account and allows ten tries in 15 minutes", async () => {
    deps.currentSession.mockResolvedValueOnce(null);
    expect((await change({ next: "new password 1" })).status).toBe(401);
    const answers = await Promise.all(
      Array.from({ length: 11 }, () => change({ current: "guess", next: "new password 1" }, "10.4.0.2")),
    );
    expect(answers.at(-1)?.status).toBe(429);
  });
});
