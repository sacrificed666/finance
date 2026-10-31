import { describe, expect, it } from "vitest";

import {
  base32Decode,
  base32Encode,
  hashRecoveryCode,
  matchTotp,
  newRecoveryCodes,
  newTotpSecret,
  otpauthUri,
  totpAt,
  totpStep,
} from "@/features/auth/model/totp";

const RFC_SECRET = Buffer.from("12345678901234567890");

describe("base32", () => {
  it("encodes the RFC 4648 examples", () => {
    expect(base32Encode(Buffer.from("foobar"))).toBe("MZXW6YTBOI");
    expect(base32Decode("MZXW6YTBOI").toString()).toBe("foobar");
  });

  it("round-trips a generated secret, ignoring case and spaces", () => {
    const secret = newTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    const spaced = secret.toLowerCase().replaceAll(/(.{4})/gu, "$1 ");
    expect(base32Encode(base32Decode(spaced))).toBe(secret);
  });
});

describe("TOTP", () => {
  it("matches the RFC 6238 SHA-1 test vectors", () => {
    expect(totpAt(RFC_SECRET, totpStep(59_000), 8)).toBe("94287082");
    expect(totpAt(RFC_SECRET, totpStep(1_111_111_109_000), 8)).toBe("07081804");
    expect(totpAt(RFC_SECRET, totpStep(1_234_567_890_000), 8)).toBe("89005924");
    expect(totpAt(RFC_SECRET, totpStep(20_000_000_000_000), 8)).toBe("65353130");
  });

  it("accepts the current code and one step either side, and nothing else", () => {
    const secret = base32Encode(RFC_SECRET);
    const now = 1_234_567_890_000;
    const step = totpStep(now);
    // The code some steps away from now
    const code = (offset: number) => totpAt(RFC_SECRET, step + offset);
    expect(matchTotp(secret, code(0), now)).toBe(step);
    expect(matchTotp(secret, code(-1), now)).toBe(step - 1);
    expect(matchTotp(secret, ` ${code(1).slice(0, 3)} ${code(1).slice(3)} `, now)).toBe(step + 1);
    expect(matchTotp(secret, code(2), now)).toBeNull();
    expect(matchTotp(secret, "12345", now)).toBeNull();
    expect(matchTotp(secret, "abcdef", now)).toBeNull();
  });

  it("names the account and issuer for authenticator apps", () => {
    expect(otpauthUri("ABC", "me@example.com")).toBe(
      "otpauth://totp/Finances:me%40example.com?secret=ABC&issuer=Finances&algorithm=SHA1&digits=6&period=30",
    );
  });
});

describe("recovery codes", () => {
  it("are eight distinct codes whose hash ignores case and separators", () => {
    const codes = newRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    expect(codes[0]).toMatch(/^[a-z2-7]{5}-[a-z2-7]{5}$/);
    expect(hashRecoveryCode(codes[0]!.toUpperCase().replace("-", " "))).toBe(hashRecoveryCode(codes[0]!));
    expect(hashRecoveryCode(codes[0]!)).not.toBe(hashRecoveryCode(codes[1]!));
  });
});
