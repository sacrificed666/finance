import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

import type { MessageKey } from "@/shared/i18n/messages/en";

interface ScryptParams {
  N: number;
  r: number;
  p: number;
}

// scrypt as a promise
const scrypt = (password: string, salt: Buffer, length: number, options: ScryptOptions): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });

const KEYLEN = 64;
const CURRENT: ScryptParams = { N: 1 << 17, r: 8, p: 1 };
const LEGACY: ScryptParams = { N: 1 << 14, r: 8, p: 1 };

// The key of a password, salt and cost, with room for the largest cost
const derive = (password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> =>
  scrypt(password, salt, KEYLEN, { ...params, maxmem: 512 * 1024 * 1024 });

// A password hash as scrypt2$N$r$p$salt$hash
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, CURRENT);
  return `scrypt2$${CURRENT.N}$${CURRENT.r}$${CURRENT.p}$${salt.toString("hex")}$${hash.toString("hex")}`;
};

// The cost, salt and hash of a stored hash, either scheme, or null when broken
const parseStored = (stored: string): { params: ScryptParams; salt: string; hash: string } | null => {
  const [scheme, ...rest] = stored.split("$");
  if (scheme === "scrypt2") {
    const [n, r, p, salt, hash] = rest;
    const params = { N: Number(n), r: Number(r), p: Number(p) };
    return salt && hash ? { params, salt, hash } : null;
  }
  if (scheme === "scrypt") {
    const [salt, hash] = rest;
    return salt && hash ? { params: LEGACY, salt, hash } : null;
  }
  return null;
};

// Whether a password matches a stored hash, compared in constant time
export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const parsed = parseStored(stored);
  if (!parsed) return false;
  const { params } = parsed;
  if (!Number.isInteger(params.N) || !Number.isInteger(params.r) || !Number.isInteger(params.p)) return false;
  const expected = Buffer.from(parsed.hash, "hex");
  if (expected.length !== KEYLEN) return false;
  const actual = await derive(password, Buffer.from(parsed.salt, "hex"), params);
  return timingSafeEqual(actual, expected);
};

// Whether a stored hash uses an older scheme or cost
export const needsRehash = (stored: string): boolean =>
  !stored.startsWith(`scrypt2$${CURRENT.N}$${CURRENT.r}$${CURRENT.p}$`);

// What is wrong with a new password, as a message key, or null when it will do
export const passwordProblem = (password: string): MessageKey | null => {
  if (password.length < 10) return "password.problem.short";
  if (password.length > 200) return "password.problem.long";
  return null;
};
