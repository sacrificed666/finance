import { afterEach, describe, expect, it, vi } from "vitest";

import { keyFromAuthSecret, keyFromSetting, sealWith } from "./sealing";

const KEY = Buffer.alloc(32, 1).toString("base64");
const OLD = Buffer.alloc(32, 2).toString("base64");
const PLACE = "settings/u1";

// The module as a server with these settings would load it
const load = async (env: Record<string, string>) => {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  return import("./secrets");
};

describe("secrets", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stores plain text and warns once when no key is set", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const secrets = await load({ DATA_ENCRYPTION_KEY: "", AUTH_SECRET: "" });
    expect(secrets.encryptionMode).toBe("off");
    expect(secrets.seal("plain", PLACE)).toBe("plain");
    expect(secrets.open("plain", PLACE)).toBe("plain");
    expect(() => secrets.open(sealWith(keyFromSetting(KEY), "x", PLACE), PLACE)).toThrow("no encryption key");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("seals with the set key and opens what it sealed in the same place", async () => {
    const secrets = await load({ DATA_ENCRYPTION_KEY: KEY, AUTH_SECRET: "auth" });
    expect(secrets.encryptionMode).toBe("key");
    const sealed = secrets.sealRecord({ a: 1 }, PLACE);
    expect(sealed.startsWith("enc.v2.")).toBe(true);
    expect(secrets.openRecord(sealed, PLACE)).toEqual({ a: 1 });
    expect(secrets.open(null, PLACE)).toBeNull();
    expect(secrets.openRecord("not json", PLACE)).toBeNull();
    expect(() => secrets.open(sealed, "settings/u2")).toThrow("for another place");
  });

  it("refuses a sealed format it does not read instead of passing it on as text", async () => {
    const secrets = await load({ DATA_ENCRYPTION_KEY: KEY, AUTH_SECRET: "" });
    expect(() => secrets.open("enc.v1.AAAA", PLACE)).toThrow("format this server does not read");
  });

  it("derives a key from AUTH_SECRET when there is no key of its own", async () => {
    const secrets = await load({ DATA_ENCRYPTION_KEY: "", AUTH_SECRET: "auth" });
    expect(secrets.encryptionMode).toBe("derived");
    expect(secrets.open(sealWith(keyFromAuthSecret("auth"), "hello", PLACE), PLACE)).toBe("hello");
  });

  it("opens records of an older key and seals them again with the current one", async () => {
    const secrets = await load({ DATA_ENCRYPTION_KEY: KEY, DATA_ENCRYPTION_KEY_PREVIOUS: OLD, AUTH_SECRET: "" });
    expect(secrets.hasOlderKeys).toBe(true);
    const old = sealWith(keyFromSetting(OLD), "kept", PLACE);
    expect(secrets.open(old, PLACE)).toBe("kept");
    const resealed = secrets.resealed(old, PLACE);
    expect(resealed).not.toBeNull();
    expect(secrets.open(resealed, PLACE)).toBe("kept");
    expect(secrets.resealed(resealed, PLACE)).toBeNull();
    expect(secrets.resealed("plain", PLACE)).toBeNull();
    expect(() =>
      secrets.open(sealWith(keyFromSetting(Buffer.alloc(32, 9).toString("base64")), "x", PLACE), PLACE),
    ).toThrow("a key this server does not have");
  });

  it("names a place for every kind of sealed value", async () => {
    const { sealedIn } = await load({ DATA_ENCRYPTION_KEY: KEY, AUTH_SECRET: "" });
    expect(
      [
        sealedIn.record("u", "transactions", "t"),
        sealedIn.settings("u"),
        sealedIn.profile("u"),
        sealedIn.twoFactor("u"),
        sealedIn.attachment("u", "a"),
        sealedIn.integration("u", "monobank"),
        sealedIn.push("u", "d"),
        sealedIn.passkey("u", "k"),
        sealedIn.signIn("u"),
      ].every((place, index, all) => all.indexOf(place) === index),
    ).toBe(true);
  });
});
