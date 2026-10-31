import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerQueries, type QueryFn } from "@/test/db";

const db = vi.hoisted(() => ({ query: vi.fn<QueryFn>(), rows: [] as Array<{ id: string; secret: string }> }));

interface VerifyOptions {
  expectedChallenge: (challenge: string) => boolean;
  requireUserVerification?: boolean;
}

const webauthn = vi.hoisted(() => ({
  challenge: "challenge-1",
  verified: true,
}));

vi.mock("@/shared/api/db", () => ({ getPool: () => ({ query: db.query }), ensureSchema: () => Promise.resolve() }));

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: (options: object) => Promise.resolve({ ...options, challenge: webauthn.challenge }),
  generateAuthenticationOptions: () => Promise.resolve({ challenge: webauthn.challenge }),
  verifyRegistrationResponse: (options: VerifyOptions) =>
    Promise.resolve(
      webauthn.verified && options.requireUserVerification === true && options.expectedChallenge(webauthn.challenge)
        ? {
            verified: true,
            registrationInfo: {
              credential: { id: "cred-1", publicKey: new Uint8Array([1, 2]), counter: 0, transports: ["internal"] },
            },
          }
        : { verified: false },
    ),
  verifyAuthenticationResponse: (options: VerifyOptions) =>
    Promise.resolve(
      webauthn.verified && options.requireUserVerification === true && options.expectedChallenge(webauthn.challenge)
        ? { verified: true, authenticationInfo: { newCounter: 5 } }
        : { verified: false },
    ),
}));

import {
  finishRegistration,
  listPasskeys,
  loginOptions,
  registrationOptions,
  removePasskey,
  verifyPasskeyLogin,
} from "./passkeys";

// A credential as the browser sends it
const credential = { id: "cred-1", rawId: "cred-1", type: "public-key", response: {}, clientExtensionResults: {} };

describe("passkeys", () => {
  beforeEach(() => {
    db.rows = [];
    webauthn.verified = true;
    answerQueries(db.query, [
      [/SELECT id, secret FROM passkeys/u, () => db.rows],
      [
        /INSERT INTO passkeys/u,
        (params) => {
          db.rows.push({ id: String(params[0]), secret: String(params[2]) });
          return [];
        },
      ],
      [
        /SELECT p.user_id/u,
        (params) =>
          db.rows
            .filter((row) => row.id === params[0])
            .map((row) => ({ user_id: "u1", secret: row.secret, email: "me@example.com", name: "Me", image: null })),
      ],
    ]);
  });

  it("adds a passkey once its challenge checks out, and lists it", async () => {
    const options = await registrationOptions("u1", "me@example.com", "");
    expect(options).toMatchObject({ rpID: "localhost", userName: "me@example.com", userDisplayName: "me@example.com" });
    expect(options).toMatchObject({ authenticatorSelection: { userVerification: "required" } });
    await expect(finishRegistration("u1", { nonsense: true }, "Chrome")).resolves.toBe(false);
    await expect(finishRegistration("u1", credential, "Chrome · macOS")).resolves.toBe(true);
    await expect(finishRegistration("u1", credential, "Again")).resolves.toBe(false);
    const [listed] = await listPasskeys("u1");
    expect(listed).toMatchObject({ id: "cred-1", name: "Chrome · macOS", lastUsedAt: null });
  });

  it("signs in with a known passkey and counts its use", async () => {
    await registrationOptions("u1", "me@example.com", "Me");
    await finishRegistration("u1", credential, "");
    await loginOptions();
    await expect(verifyPasskeyLogin(credential)).resolves.toEqual({
      id: "u1",
      email: "me@example.com",
      name: "Me",
      image: null,
    });
    expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining("UPDATE passkeys SET secret"), [
      "cred-1",
      expect.any(String),
    ]);
    await expect(verifyPasskeyLogin(credential)).resolves.toBeNull();
    await expect(verifyPasskeyLogin({ id: 5 })).resolves.toBeNull();
    await expect(verifyPasskeyLogin({ ...credential, id: "unknown", rawId: "unknown" })).resolves.toBeNull();
  });

  it("refuses a sign-in the authenticator does not verify, and removes passkeys", async () => {
    await registrationOptions("u1", "me@example.com", "Me");
    await finishRegistration("u1", credential, "Key");
    await loginOptions();
    webauthn.verified = false;
    await expect(verifyPasskeyLogin(credential)).resolves.toBeNull();
    await removePasskey("u1", "cred-1");
    expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining("DELETE FROM passkeys"), ["u1", "cred-1"]);
  });
});
