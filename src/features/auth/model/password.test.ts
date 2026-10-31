import { scryptSync } from "node:crypto";

import { describe, expect, it } from "vitest";

import { hashPassword, needsRehash, passwordProblem, verifyPassword } from "./password";

describe("password", () => {
  it("hashes with the current cost and verifies only the right password", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored).toMatch(/^scrypt2\$131072\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/u);
    expect(needsRehash(stored)).toBe(false);
    await expect(verifyPassword("correct horse battery", stored)).resolves.toBe(true);
    await expect(verifyPassword("wrong horse battery", stored)).resolves.toBe(false);
  });

  it("still verifies the older scheme and asks for a new hash", async () => {
    const salt = Buffer.alloc(16, 3);
    const hash = scryptSync("legacy pass 1", salt, 64, { N: 16_384, r: 8, p: 1 });
    const stored = `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
    expect(needsRehash(stored)).toBe(true);
    await expect(verifyPassword("legacy pass 1", stored)).resolves.toBe(true);
  });

  it("refuses broken hashes", async () => {
    await expect(verifyPassword("x", "md5$abc")).resolves.toBe(false);
    await expect(verifyPassword("x", "scrypt$")).resolves.toBe(false);
    await expect(verifyPassword("x", "scrypt2$a$b$c$00$00")).resolves.toBe(false);
    await expect(verifyPassword("x", "scrypt2$16384$8$1$00$00")).resolves.toBe(false);
    await expect(verifyPassword("x", "scrypt2$16384$8$1$$")).resolves.toBe(false);
  });

  it("says what is wrong with a new password", () => {
    expect(passwordProblem("short")).toBe("password.problem.short");
    expect(passwordProblem("x".repeat(201))).toBe("password.problem.long");
    expect(passwordProblem("long enough")).toBeNull();
  });
});
