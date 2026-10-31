import "server-only";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";

import { ensureSchema, getPool } from "@/shared/api/db";
import { isRecord, readNumber, readString, readStrings, readText } from "@/shared/lib/guards";
import { openRecord, sealedIn, sealRecord } from "@/shared/lib/secrets";

interface StoredPasskey {
  publicKey: string;
  counter: number;
  transports?: string[];
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface PasskeySummary {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

type Purpose = "register" | "login";

const CHALLENGE_MS = 5 * 60_000;

// The challenges handed out, each for one purpose and account, until it expires
const challenges = new Map<string, { purpose: Purpose; userId: string | null; expires: number }>();

// The site passkeys belong to, from AUTH_URL
const relyingParty = (): { id: string; origin: string } => {
  const configured = process.env.AUTH_URL?.trim() ?? "";
  const url = new URL(configured === "" ? "http://localhost:3000" : configured);
  return { id: url.hostname, origin: url.origin };
};

// Keeps a new challenge and forgets the expired ones
const remember = (challenge: string, purpose: Purpose, userId: string | null) => {
  const now = Date.now();
  for (const [key, value] of challenges) if (value.expires < now) challenges.delete(key);
  challenges.set(challenge, { purpose, userId, expires: now + CHALLENGE_MS });
};

// Whether a challenge was handed out for this purpose and account; it works once
const redeem = (challenge: string, purpose: Purpose, userId: string | null): boolean => {
  const found = challenges.get(challenge);
  challenges.delete(challenge);
  return found?.purpose === purpose && found.userId === userId && found.expires >= Date.now();
};

// A stored passkey, or null when the record is not one
const storedPasskey = (value: unknown): StoredPasskey | null => {
  const publicKey = readString(value, "publicKey");
  const counter = readNumber(value, "counter");
  const name = readText(value, "name");
  const createdAt = readText(value, "createdAt");
  if (publicKey === null || counter === null || name === null || createdAt === null) return null;
  const record: StoredPasskey = { publicKey, counter, name, createdAt };
  if (isRecord(value) && Array.isArray(value.transports)) record.transports = readStrings(value, "transports");
  const lastUsedAt = readString(value, "lastUsedAt");
  if (lastUsedAt) record.lastUsedAt = lastUsedAt;
  return record;
};

// Whether a value has the outer shape of a credential the browser sends
const isCredential = (value: unknown): boolean =>
  readString(value, "id") !== null &&
  readString(value, "rawId") !== null &&
  isRecord(value) &&
  value.type === "public-key" &&
  isRecord(value.response);

// Whether a value looks like a new passkey from the browser
const isRegistration = (value: unknown): value is RegistrationResponseJSON => isCredential(value);

// Whether a value looks like a passkey sign-in from the browser
const isAuthentication = (value: unknown): value is AuthenticationResponseJSON => isCredential(value);

// The account's passkeys that open, oldest first
const rows = async (userId: string): Promise<Array<{ id: string; record: StoredPasskey }>> => {
  await ensureSchema();
  const res = await getPool().query<{ id: string; secret: string }>(
    `SELECT id, secret FROM passkeys WHERE user_id = $1 ORDER BY created_at`,
    [userId],
  );
  return res.rows.flatMap((row) => {
    const record = storedPasskey(openRecord(row.secret, sealedIn.passkey(userId, row.id)));
    return record ? [{ id: row.id, record }] : [];
  });
};

// The account's passkeys for the profile page
export const listPasskeys = async (userId: string): Promise<PasskeySummary[]> =>
  (await rows(userId)).map(({ id, record }) => ({
    id,
    name: record.name,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt ?? null,
  }));

// The options for adding a passkey, leaving out the ones the account has
export const registrationOptions = async (userId: string, email: string, displayName: string) => {
  const existing = await rows(userId);
  const rp = relyingParty();
  const options = await generateRegistrationOptions({
    rpName: "Finances",
    rpID: rp.id,
    userName: email,
    userDisplayName: displayName ? displayName : email,
    userID: new TextEncoder().encode(userId),
    attestationType: "none",
    excludeCredentials: existing.map(({ id, record }) => ({ id, transports: record.transports })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  remember(options.challenge, "register", userId);
  return options;
};

// Checks a new passkey against its challenge and stores it sealed
export const finishRegistration = async (userId: string, response: unknown, name: string): Promise<boolean> => {
  if (!isRegistration(response)) return false;
  const rp = relyingParty();
  const result = await verifyRegistrationResponse({
    response,
    expectedChallenge: (challenge) => redeem(challenge, "register", userId),
    expectedOrigin: rp.origin,
    expectedRPID: rp.id,
    requireUserVerification: true,
  }).catch(() => null);
  if (!result?.verified) return false;
  const { credential } = result.registrationInfo;
  const label = name.slice(0, 60);
  const record: StoredPasskey = {
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    transports: credential.transports,
    name: label ? label : "Passkey",
    createdAt: new Date().toISOString(),
  };
  await getPool().query(`INSERT INTO passkeys (id, user_id, secret) VALUES ($1, $2, $3)`, [
    credential.id,
    userId,
    sealRecord(record, sealedIn.passkey(userId, credential.id)),
  ]);
  return true;
};

// Deletes one of the account's passkeys
export const removePasskey = async (userId: string, id: string): Promise<void> => {
  await ensureSchema();
  await getPool().query(`DELETE FROM passkeys WHERE user_id = $1 AND id = $2`, [userId, id]);
};

// The options for signing in with any passkey of this site
export const loginOptions = async () => {
  const rp = relyingParty();
  const options = await generateAuthenticationOptions({ rpID: rp.id, userVerification: "required" });
  remember(options.challenge, "login", null);
  return options;
};

// The account a passkey sign-in belongs to, or null when it does not verify
export const verifyPasskeyLogin = async (
  response: unknown,
): Promise<{ id: string; email: string | null; name: string | null; image: string | null } | null> => {
  if (!isAuthentication(response)) return null;
  await ensureSchema();
  const found = await getPool().query<{
    user_id: string;
    secret: string;
    email: string | null;
    name: string | null;
    image: string | null;
  }>(
    `SELECT p.user_id, p.secret, u.email, u.name, u.image FROM passkeys p JOIN users u ON u.id = p.user_id WHERE p.id = $1`,
    [response.id],
  );
  const row = found.rows[0];
  const record = row ? storedPasskey(openRecord(row.secret, sealedIn.passkey(row.user_id, response.id))) : null;
  if (!row || !record) return null;
  const rp = relyingParty();
  const result = await verifyAuthenticationResponse({
    response,
    expectedChallenge: (challenge) => redeem(challenge, "login", null),
    expectedOrigin: rp.origin,
    expectedRPID: rp.id,
    credential: {
      id: response.id,
      publicKey: new Uint8Array(Buffer.from(record.publicKey, "base64url")),
      counter: record.counter,
      transports: record.transports,
    },
    requireUserVerification: true,
  }).catch(() => null);
  if (!result?.verified) return null;
  await getPool().query(`UPDATE passkeys SET secret = $2 WHERE id = $1`, [
    response.id,
    sealRecord(
      { ...record, counter: result.authenticationInfo.newCounter, lastUsedAt: new Date().toISOString() },
      sealedIn.passkey(row.user_id, response.id),
    ),
  ]);
  return { id: row.user_id, email: row.email, name: row.name, image: row.image };
};
