import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({
  owner: { email: "" },
  createAccount: vi.fn<(email: string, hash: string, name: string | null) => Promise<boolean>>(),
  logError: vi.fn<(route: string, error: unknown) => Promise<void>>(),
}));

vi.mock("@/features/auth/model/accounts", () => ({ createAccount: deps.createAccount }));
vi.mock("@/features/auth/model/authConfig", () => ({
  signUpAllowed: (email: string) => deps.owner.email === "" || email === deps.owner.email,
}));
vi.mock("@/features/auth/model/password", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  hashPassword: (password: string) => Promise.resolve(`hash:${password}`),
}));
vi.mock("@/features/settings/api/errorLog", () => ({ logError: deps.logError }));

const { POST } = await import("./route");

// A sign-up from an address
const signUp = (body: unknown, ip: string) =>
  POST(request("/api/auth/register", "POST", body, { "x-forwarded-for": ip }));

const GOOD = { email: " New@Example.com ", password: "long enough password", name: "New" };

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    deps.owner.email = "";
    deps.createAccount.mockReset().mockResolvedValue(true);
  });

  it("creates an account with a hashed password", async () => {
    await expect(answerOf(await signUp(GOOD, "10.1.0.1"))).resolves.toEqual({ status: 201, body: { ok: true } });
    expect(deps.createAccount).toHaveBeenCalledWith("new@example.com", "hash:long enough password", "New");
  });

  it("names what is wrong with a sign-up", async () => {
    await expect(answerOf(await signUp("{", "10.1.0.2"))).resolves.toMatchObject({ status: 400 });
    await expect(answerOf(await signUp({ ...GOOD, email: "nope" }, "10.1.0.2"))).resolves.toEqual({
      status: 400,
      body: { error: "auth.error.email" },
    });
    await expect(answerOf(await signUp({ ...GOOD, password: "short" }, "10.1.0.2"))).resolves.toEqual({
      status: 400,
      body: { error: "password.problem.short" },
    });
    deps.createAccount.mockResolvedValue(false);
    await expect(answerOf(await signUp(GOOD, "10.1.0.2"))).resolves.toEqual({
      status: 409,
      body: { error: "auth.problem.taken" },
    });
    deps.createAccount.mockRejectedValue(new Error("db down"));
    await expect(answerOf(await signUp(GOOD, "10.1.0.2"))).resolves.toEqual({
      status: 500,
      body: { error: "auth.error.create" },
    });
    expect(deps.logError).toHaveBeenCalledWith("api/auth/register", expect.any(Error));
  });

  it("lets only the owner sign up when one is set", async () => {
    deps.owner.email = "owner@example.com";
    await expect(answerOf(await signUp(GOOD, "10.1.0.3"))).resolves.toEqual({
      status: 403,
      body: { error: "auth.problem.closed" },
    });
    expect((await signUp({ ...GOOD, email: "owner@example.com" }, "10.1.0.3")).status).toBe(201);
  });

  it("allows five sign-ups from an address in 15 minutes", async () => {
    const answers = await Promise.all(Array.from({ length: 6 }, () => signUp(GOOD, "10.1.0.4")));
    const last = answers.at(-1);
    expect(answers.slice(0, 5).every((answer) => answer.status === 201)).toBe(true);
    expect(last?.status).toBe(429);
    expect(Number(last?.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
