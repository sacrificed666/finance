import { afterEach, describe, expect, it, vi } from "vitest";

import { beginTwoFactor, sendTwoFactor } from "./twoFactor";

// A fetch that answers with this reply
const answer = (reply: Response) => {
  vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(reply));
};

describe("two-factor requests", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts the setup with a secret and its address", async () => {
    answer(Response.json({ secret: "ABCD", uri: "otpauth://totp/x" }));
    await expect(beginTwoFactor()).resolves.toEqual({ secret: "ABCD", uri: "otpauth://totp/x" });
  });

  it("gives back the recovery codes, or why the code was refused", async () => {
    answer(Response.json({ recovery: ["a-1", "b-2"] }));
    await expect(sendTwoFactor("confirm", "123456")).resolves.toEqual({ ok: true, recovery: ["a-1", "b-2"] });
    answer(Response.json({ error: "wait" }, { status: 429 }));
    await expect(sendTwoFactor("confirm", "123456")).resolves.toEqual({ ok: false, reason: "wait" });
    answer(Response.json({ error: "code" }, { status: 400 }));
    await expect(sendTwoFactor("disable", "000000")).resolves.toEqual({ ok: false, reason: "wrong" });
  });
});
