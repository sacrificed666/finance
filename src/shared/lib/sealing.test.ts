import { describe, expect, it } from "vitest";

import { isSealed, keyFromAuthSecret, keyFromSetting, looksSealed, openWith, sealWith } from "@/shared/lib/sealing";

const current = keyFromSetting(Buffer.alloc(32, 7).toString("base64"));
const derived = keyFromAuthSecret("auth-secret");
const other = keyFromSetting("some passphrase");
const PLACE = "records/u1/transactions/t1";

describe("sealing", () => {
  it("reads a base64 key of 32 bytes as it is, and hashes anything else", () => {
    expect(current.equals(Buffer.alloc(32, 7))).toBe(true);
    expect(other).toHaveLength(32);
    expect(keyFromSetting("some passphrase").equals(other)).toBe(true);
  });

  it("opens with the key that sealed, and says which one it was", () => {
    const sealed = sealWith(derived, '{"amount":420}', PLACE);
    expect(isSealed(sealed)).toBe(true);
    expect(openWith([current, derived], sealed, PLACE)).toEqual({ plain: '{"amount":420}', keyIndex: 1 });
    expect(openWith([derived], sealed, PLACE)?.keyIndex).toBe(0);
  });

  it("gives nothing back for a key that did not seal it", () => {
    expect(openWith([current, other], sealWith(derived, "x", PLACE), PLACE)).toBeNull();
  });

  it("opens only in the place it was sealed for", () => {
    const sealed = sealWith(current, "rent", PLACE);
    expect(openWith([current], sealed, "records/u2/transactions/t1")).toBeNull();
    expect(openWith([current], sealed, "records/u1/transactions/t2")).toBeNull();
  });

  it("never seals the same text the same way twice", () => {
    expect(sealWith(current, "same", PLACE)).not.toBe(sealWith(current, "same", PLACE));
  });

  it("tells sealed text of any format from plain text", () => {
    expect(looksSealed("enc.v1.abc")).toBe(true);
    expect(isSealed("enc.v1.abc")).toBe(false);
    expect(looksSealed('{"a":1}')).toBe(false);
  });
});
