import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerQueries, type QueryFn } from "@/test/db";

type Authorize = (raw: unknown, request: Request) => Promise<unknown>;

interface Config {
  providers: Array<{ id?: string; authorize?: Authorize }>;
  callbacks: {
    signIn: (input: {
      user: { email?: string | null };
      account?: { provider: string } | null;
      profile?: { email?: string; email_verified?: boolean };
    }) => Promise<boolean>;
    jwt: (input: {
      token: Record<string, unknown>;
      user?: { id?: string };
      account?: { provider: string } | null;
    }) => Promise<unknown>;
    session: (input: {
      session: { user: { id?: string }; signInId?: string };
      token: Record<string, unknown>;
    }) => Promise<unknown>;
  };
}

const captured = vi.hoisted((): { config: Config | null } => ({ config: null }));
const db = vi.hoisted(() => ({ query: vi.fn<QueryFn>() }));
const deps = vi.hoisted(() => ({
  verifyPassword: vi.fn<(password: string, stored: string) => Promise<boolean>>(),
  needsRehash: vi.fn<(stored: string) => boolean>(),
  hashPassword: vi.fn<(password: string) => Promise<string>>(),
  setPasswordHash: vi.fn<(id: string, hash: string) => Promise<void>>(),
  twoFactorEnabled: vi.fn<(id: string) => Promise<boolean>>(),
  verifySecondFactor: vi.fn<(id: string, code: string) => Promise<boolean>>(),
  verifyPasskeyLogin: vi.fn<(response: unknown) => Promise<unknown>>(),
  sessionState: vi.fn<(id: string) => Promise<{ epoch: number; keeper: string | null } | null>>(),
  accountExists: vi.fn<(email: string) => Promise<boolean>>(),
  noteSignIn: vi.fn<(id: string, method: string) => Promise<string | undefined>>(),
}));

vi.mock("next-auth", () => ({
  default: (config: Config) => {
    captured.config = config;
    return { handlers: {}, signIn: vi.fn<() => void>(), signOut: vi.fn<() => void>(), auth: vi.fn<() => void>() };
  },
  CredentialsSignin: class extends Error {},
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: (options: object) => ({ type: "credentials", ...options }),
}));
vi.mock("next-auth/providers/google", () => ({ default: (options: object) => ({ id: "google", ...options }) }));
vi.mock("@auth/pg-adapter", () => ({ default: () => ({}) }));
vi.mock("@/shared/api/db", () => ({ getPool: () => ({ query: db.query }), ensureSchema: () => Promise.resolve() }));
vi.mock("@/features/auth/model/password", () => ({
  verifyPassword: deps.verifyPassword,
  needsRehash: deps.needsRehash,
  hashPassword: deps.hashPassword,
}));
vi.mock("@/features/auth/model/accounts", () => ({
  setPasswordHash: deps.setPasswordHash,
  accountExists: deps.accountExists,
}));
vi.mock("@/features/auth/model/twoFactor", () => ({
  twoFactorEnabled: deps.twoFactorEnabled,
  verifySecondFactor: deps.verifySecondFactor,
}));
vi.mock("@/features/auth/model/passkeys", () => ({ verifyPasskeyLogin: deps.verifyPasskeyLogin }));
vi.mock("@/features/auth/model/sessions", () => ({ sessionState: deps.sessionState }));
vi.mock("@/features/auth/model/signIns", () => ({ noteSignIn: deps.noteSignIn }));

await import("./auth");

// The captured Auth.js configuration
const config = (): Config => {
  if (!captured.config) throw new Error("Auth.js was not configured");
  return captured.config;
};

// The authorize step of a provider
const authorizeOf = (id: string): Authorize => {
  const provider = config().providers.find((entry) => (entry.id ?? "credentials") === id);
  if (!provider?.authorize) throw new Error(`No ${id} provider`);
  return provider.authorize;
};

// A sign-in request from an address
const request = (ip: string) => new Request("http://localhost/api/auth", { headers: { "x-forwarded-for": ip } });

describe("auth", () => {
  beforeEach(() => {
    for (const mock of Object.values(deps)) mock.mockReset();
    answerQueries(db.query, [
      [
        /FROM users WHERE lower\(email\)/u,
        (params) =>
          params[0] === "me@example.com"
            ? [{ id: "u1", email: "me@example.com", name: "Me", image: null, password_hash: "stored" }]
            : [],
      ],
    ]);
    deps.verifyPassword.mockImplementation((password) => Promise.resolve(password === "right password"));
    deps.needsRehash.mockReturnValue(false);
    deps.twoFactorEnabled.mockResolvedValue(false);
  });

  it("signs in with the right password only", async () => {
    const authorize = authorizeOf("credentials");
    await expect(
      authorize({ email: " Me@Example.com ", password: "right password" }, request("10.0.0.1")),
    ).resolves.toEqual({
      id: "u1",
      email: "me@example.com",
      name: "Me",
      image: null,
    });
    await expect(authorize({ email: "me@example.com", password: "wrong" }, request("10.0.0.1"))).resolves.toBeNull();
    await expect(
      authorize({ email: "nobody@example.com", password: "right password" }, request("10.0.0.1")),
    ).resolves.toBeNull();
    await expect(authorize({ email: "", password: "x" }, request("10.0.0.1"))).resolves.toBeNull();
    expect(deps.verifyPassword).toHaveBeenCalledWith("right password", expect.stringMatching(/^scrypt\$00\$0+$/u));
  });

  it("upgrades an old hash and asks for the second factor", async () => {
    const authorize = authorizeOf("credentials");
    deps.needsRehash.mockReturnValue(true);
    deps.hashPassword.mockResolvedValue("new hash");
    deps.twoFactorEnabled.mockResolvedValue(true);
    await expect(
      authorize({ email: "me@example.com", password: "right password" }, request("10.0.0.2")),
    ).rejects.toMatchObject({
      code: "two_factor",
    });
    expect(deps.setPasswordHash).toHaveBeenCalledWith("u1", "new hash");
    deps.verifySecondFactor.mockResolvedValue(false);
    await expect(
      authorize({ email: "me@example.com", password: "right password", code: "123456" }, request("10.0.0.2")),
    ).rejects.toMatchObject({ code: "two_factor_wrong" });
    deps.verifySecondFactor.mockResolvedValue(true);
    await expect(
      authorize({ email: "me@example.com", password: "right password", code: "123456" }, request("10.0.0.2")),
    ).resolves.toMatchObject({ id: "u1" });
  });

  it("stops after thirty attempts for one email from any number of addresses", async () => {
    const authorize = authorizeOf("credentials");
    const attempts = Array.from({ length: 31 }, (_, index) =>
      authorize({ email: "many@example.com", password: "wrong" }, request(`10.9.0.${String(index)}`)),
    );
    await Promise.all(attempts);
    expect(deps.verifyPassword).toHaveBeenCalledTimes(30);
  });

  it("lets Google in only for an account that exists or may sign up", async () => {
    const { signIn } = config().callbacks;
    deps.accountExists.mockResolvedValue(false);
    await expect(signIn({ user: {}, account: { provider: "credentials" } })).resolves.toBe(true);
    const google = { provider: "google" };
    vi.stubEnv("APP_ENV", "production");
    await expect(signIn({ user: {}, account: google, profile: { email: "x@example.com" } })).resolves.toBe(false);
    deps.accountExists.mockResolvedValue(true);
    await expect(signIn({ user: {}, account: google, profile: { email: "Me@Example.com" } })).resolves.toBe(true);
    expect(deps.accountExists).toHaveBeenCalledWith("me@example.com");
    await expect(
      signIn({ user: {}, account: google, profile: { email: "me@example.com", email_verified: false } }),
    ).resolves.toBe(false);
    await expect(signIn({ user: { email: null }, account: google })).resolves.toBe(false);
    vi.stubEnv("APP_ENV", "development");
    deps.accountExists.mockResolvedValue(false);
    await expect(signIn({ user: { email: "new@example.com" }, account: google })).resolves.toBe(true);
  });

  it("stops after ten attempts for one email and address", async () => {
    const authorize = authorizeOf("credentials");
    const attempts = Array.from({ length: 11 }, () =>
      authorize({ email: "ten@example.com", password: "wrong" }, request("10.0.0.3")),
    );
    await Promise.all(attempts);
    expect(deps.verifyPassword).toHaveBeenCalledTimes(10);
  });

  it("signs in with a passkey the server verifies", async () => {
    const authorize = authorizeOf("passkey");
    deps.verifyPasskeyLogin.mockResolvedValue({ id: "u1" });
    await expect(authorize({ response: '{"id":"cred"}' }, request("10.0.0.4"))).resolves.toEqual({ id: "u1" });
    expect(deps.verifyPasskeyLogin).toHaveBeenCalledWith({ id: "cred" });
    await expect(authorize({ response: "{" }, request("10.0.0.4"))).resolves.toBeNull();
  });

  it("stamps new tokens, drops outdated ones and fills the session", async () => {
    const { jwt, session } = config().callbacks;
    deps.sessionState.mockResolvedValue({ epoch: 2, keeper: null });
    deps.noteSignIn.mockResolvedValue("sign-in-1");
    await expect(jwt({ token: {}, user: { id: "u1" }, account: { provider: "google" } })).resolves.toEqual({
      sub: "u1",
      epoch: 2,
      signInId: "sign-in-1",
    });
    expect(deps.noteSignIn).toHaveBeenCalledWith("u1", "google");
    await expect(jwt({ token: { sub: "u1", epoch: 2 } })).resolves.toEqual({ sub: "u1", epoch: 2 });
    await expect(jwt({ token: { sub: "u1", epoch: 1 } })).resolves.toBeNull();
    deps.sessionState.mockResolvedValue({ epoch: 3, keeper: "kept" });
    await expect(jwt({ token: { sub: "u1", epoch: 2, signInId: "kept" } })).resolves.toEqual({
      sub: "u1",
      epoch: 3,
      signInId: "kept",
    });
    await expect(jwt({ token: { sub: "u1", epoch: 2, signInId: "other" } })).resolves.toBeNull();
    deps.sessionState.mockResolvedValue(null);
    await expect(jwt({ token: { sub: "u1" } })).resolves.toBeNull();
    await expect(jwt({ token: {} })).resolves.toEqual({});
    await expect(session({ session: { user: {} }, token: { sub: "u1", signInId: "s" } })).resolves.toEqual({
      user: { id: "u1" },
      signInId: "s",
    });
  });
});
