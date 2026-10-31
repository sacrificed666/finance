import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerQueries, type QueryFn } from "@/test/db";

import { base32Decode, totpAt, totpStep } from "./totp";

const db = vi.hoisted(() => ({ query: vi.fn<QueryFn>(), stored: null as unknown }));

vi.mock("@/shared/api/db", () => ({ getPool: () => ({ query: db.query }), ensureSchema: () => Promise.resolve() }));

import {
  beginTwoFactor,
  confirmTwoFactor,
  disableTwoFactor,
  twoFactorEnabled,
  twoFactorRecord,
  verifySecondFactor,
} from "./twoFactor";

// The code an authenticator shows for a secret some steps from now
const codeFor = (secret: string, offset = 0) => totpAt(base32Decode(secret), totpStep(Date.now()) + offset);

describe("twoFactor", () => {
  beforeEach(() => {
    db.stored = null;
    answerQueries(db.query, [
      [/SELECT two_factor/u, () => [{ two_factor: db.stored }]],
      [
        /UPDATE users SET two_factor/u,
        (params) => {
          db.stored = params[1];
          return [];
        },
      ],
    ]);
  });

  it("starts, confirms with a code and then asks for one", async () => {
    await expect(twoFactorEnabled("u1")).resolves.toBe(false);
    const started = await beginTwoFactor("u1", "me@example.com");
    expect(started?.uri).toContain("otpauth://totp/Finances:me%40example.com");
    const secret = started?.secret ?? "";
    await expect(confirmTwoFactor("u1", "000000")).resolves.toBeNull();
    const recovery = await confirmTwoFactor("u1", codeFor(secret));
    expect(recovery).toHaveLength(8);
    await expect(twoFactorEnabled("u1")).resolves.toBe(true);
    await expect(beginTwoFactor("u1", "me@example.com")).resolves.toBeNull();
  });

  it("takes each code once, then spends recovery codes", async () => {
    const secret = (await beginTwoFactor("u2", "a@b.c"))?.secret ?? "";
    const recovery = (await confirmTwoFactor("u2", codeFor(secret))) ?? [];
    await expect(verifySecondFactor("u2", codeFor(secret))).resolves.toBe(false);
    await expect(verifySecondFactor("u2", codeFor(secret, 1))).resolves.toBe(true);
    await expect(verifySecondFactor("u2", recovery[0]!)).resolves.toBe(true);
    await expect(verifySecondFactor("u2", recovery[0]!)).resolves.toBe(false);
    await expect(verifySecondFactor("u2", "nonsense")).resolves.toBe(false);
  });

  it("turns off with a recovery code, and lets an account without it pass", async () => {
    await expect(verifySecondFactor("u3", "")).resolves.toBe(true);
    await expect(disableTwoFactor("u3", "")).resolves.toBe(true);
    const secret = (await beginTwoFactor("u3", "a@b.c"))?.secret ?? "";
    const recovery = (await confirmTwoFactor("u3", codeFor(secret))) ?? [];
    await expect(disableTwoFactor("u3", "wrong")).resolves.toBe(false);
    await expect(disableTwoFactor("u3", recovery[1]!)).resolves.toBe(true);
    expect(db.stored).toBeNull();
  });

  it("reads only the fields a stored record may have", () => {
    expect(twoFactorRecord({ secret: "S", pending: " ", recovery: ["a", 1], extra: true })).toEqual({
      secret: "S",
      recovery: ["a"],
    });
    expect(twoFactorRecord("broken")).toEqual({});
  });
});
