import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerOf, request } from "@/test/http";

interface Session {
  user?: { id?: string; email?: string | null; name?: string | null };
}

const deps = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<Session | null>>(),
  loginOptions: vi.fn<() => Promise<object>>(),
  registrationOptions: vi.fn<(userId: string, email: string, name: string) => Promise<object>>(),
}));

vi.mock("@/features/auth/model/auth", () => ({ auth: deps.auth }));
vi.mock("@/features/auth/model/passkeys", () => ({
  loginOptions: deps.loginOptions,
  registrationOptions: deps.registrationOptions,
}));

const { POST } = await import("./route");

// Options asked for a purpose, from an address
const options = (purpose: unknown, ip = "10.3.0.1") =>
  POST(request("/api/passkeys/options", "POST", { purpose }, { "x-forwarded-for": ip }));

describe("POST /api/passkeys/options", () => {
  beforeEach(() => {
    deps.auth.mockResolvedValue({ user: { id: "u1", email: "ann@example.com", name: "Ann" } });
    deps.loginOptions.mockResolvedValue({ challenge: "login" });
    deps.registrationOptions.mockResolvedValue({ challenge: "register" });
  });

  it("gives sign-in options to anyone, a few times an address", async () => {
    await expect(answerOf(await options("login"))).resolves.toEqual({ status: 200, body: { challenge: "login" } });
    const answers = await Promise.all(Array.from({ length: 31 }, () => options("login", "10.3.0.2")));
    expect(answers.at(-1)?.status).toBe(429);
  });

  it("gives options to add a passkey to the signed-in account", async () => {
    await expect(answerOf(await options("register"))).resolves.toEqual({
      status: 200,
      body: { challenge: "register" },
    });
    expect(deps.registrationOptions).toHaveBeenCalledWith("u1", "ann@example.com", "Ann");
    deps.auth.mockResolvedValue({ user: { id: "u2", email: null, name: null } });
    await options("register");
    expect(deps.registrationOptions).toHaveBeenLastCalledWith("u2", "u2", "");
    deps.auth.mockResolvedValue(null);
    expect((await options("register")).status).toBe(401);
  });

  it("refuses other purposes", async () => {
    await expect(answerOf(await options("other"))).resolves.toEqual({ status: 400, body: { error: "purpose" } });
  });
});
