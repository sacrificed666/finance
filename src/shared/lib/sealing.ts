import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const SEALED_PREFIX = "enc.v2.";
const IV_BYTES = 12;
const TAG_BYTES = 16;

// A key from the setting: base64 of 32 bytes as it is, anything else hashed
export const keyFromSetting = (value: string): Buffer => {
  const raw = Buffer.from(value, "base64");
  return raw.length === 32 ? raw : createHash("sha256").update(value).digest();
};

// A key derived from AUTH_SECRET for setups without their own
export const keyFromAuthSecret = (secret: string): Buffer =>
  createHash("sha256").update(`finance-tracker:data:${secret}`).digest();

// Whether stored text is sealed in the current format
export const isSealed = (value: string): boolean => value.startsWith(SEALED_PREFIX);

// Whether stored text looks sealed in some format, current or not
export const looksSealed = (value: string): boolean => /^enc\.v\d+\./u.test(value);

// Text sealed with AES-256-GCM and bound to where it is kept, as prefix and base64
export const sealWith = (key: Buffer, plain: string, context: string): string => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return SEALED_PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
};

// Sealed bytes opened with one key for one place, or null when either is wrong
const openWithKey = (key: Buffer, raw: Buffer, context: string): string | null => {
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, IV_BYTES));
    decipher.setAAD(Buffer.from(context, "utf8"));
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
};

// Sealed text opened with the first key that fits its place, and which key it was
export const openWith = (
  keys: readonly Buffer[],
  value: string,
  context: string,
): { plain: string; keyIndex: number } | null => {
  const raw = Buffer.from(value.slice(SEALED_PREFIX.length), "base64");
  for (const [keyIndex, key] of keys.entries()) {
    const plain = openWithKey(key, raw, context);
    if (plain !== null) return { plain, keyIndex };
  }
  return null;
};
