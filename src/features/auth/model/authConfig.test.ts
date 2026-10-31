import { afterEach, describe, expect, it, vi } from "vitest";

// The module read again with these settings
const load = async (env: Record<string, string>) => {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("./authConfig");
};

describe("authConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lets only the owner sign up once an owner is set", async () => {
    const config = await load({ OWNER_EMAIL: " Me@Example.com ", APP_ENV: "development" });
    expect(config.isOwnerEmail("me@example.com")).toBe(true);
    expect(config.signUpAllowed("me@example.com")).toBe(true);
    expect(config.signUpAllowed("other@example.com")).toBe(false);
  });

  it("keeps sign-up open on development and closed on staging and production", async () => {
    expect((await load({ OWNER_EMAIL: "", APP_ENV: "development" })).signUpAllowed("a@example.com")).toBe(true);
    expect((await load({ OWNER_EMAIL: "", APP_ENV: "staging" })).signUpAllowed("a@example.com")).toBe(false);
    expect((await load({ OWNER_EMAIL: "", APP_ENV: "production" })).signUpAllowed("a@example.com")).toBe(false);
  });

  it("follows REGISTRATION when it says open or closed", async () => {
    const open = await load({ OWNER_EMAIL: "", APP_ENV: "production", REGISTRATION: "Open" });
    expect(open.signUpAllowed("a@example.com")).toBe(true);
    const closed = await load({ OWNER_EMAIL: "", APP_ENV: "development", REGISTRATION: "closed" });
    expect(closed.signUpAllowed("a@example.com")).toBe(false);
    expect(closed.googleEnabled).toBe(false);
  });
});
