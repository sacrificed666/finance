import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// The base32 letters of RFC 4648
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const STEP_SECONDS = 30;
export const RECOVERY_CODES = 8;

// Bytes in RFC 4648 base32 without padding
export const base32Encode = (bytes: Uint8Array): string => {
  let out = "";
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = ((value << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
};

// Base32 text as bytes, ignoring case, spaces and other marks
export const base32Decode = (text: string): Buffer => {
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of text.toUpperCase().replaceAll(/[^A-Z2-7]/gu, "")) {
    value = ((value << 5) | ALPHABET.indexOf(char)) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
};

// The RFC 6238 code of a counter step
export const totpAt = (secret: Buffer, counter: number, digits = 6): string => {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", secret).update(message).digest();
  const offset = (mac.at(-1) ?? 0) & 0x0f;
  // The MAC's byte at a place, zero past its end
  const byte = (at: number) => mac[at] ?? 0;
  const binary = ((byte(offset) & 0x7f) << 24) | (byte(offset + 1) << 16) | (byte(offset + 2) << 8) | byte(offset + 3);
  return String(binary % 10 ** digits).padStart(digits, "0");
};

// The 30 second step a moment falls in
export const totpStep = (nowMs: number): number => Math.floor(nowMs / 1000 / STEP_SECONDS);

// The step a typed code matches, a step either side allowed, or null
export const matchTotp = (secretBase32: string, code: string, nowMs: number, window = 1): number | null => {
  const typed = code.replaceAll(/\s/gu, "");
  if (!/^\d{6}$/.test(typed)) return null;
  const secret = base32Decode(secretBase32);
  const step = totpStep(nowMs);
  for (let drift = -window; drift <= window; drift++) {
    if (timingSafeEqual(Buffer.from(totpAt(secret, step + drift)), Buffer.from(typed))) return step + drift;
  }
  return null;
};

// A new random secret of 160 bits in base32
export const newTotpSecret = (): string => base32Encode(randomBytes(20));

// The otpauth link an authenticator app reads from a QR code
export const otpauthUri = (secret: string, account: string, issuer = "Finances"): string => {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
};

// One-time recovery codes such as abcde-fghij
export const newRecoveryCodes = (count = RECOVERY_CODES): string[] => {
  return Array.from({ length: count }, () => {
    const raw = base32Encode(randomBytes(7)).slice(0, 10).toLowerCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
};

// A recovery code's hash, ignoring case and dashes
export const hashRecoveryCode = (code: string): string =>
  createHash("sha256")
    .update(code.toLowerCase().replaceAll(/[^a-z2-7]/gu, ""))
    .digest("hex");
