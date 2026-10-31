import "server-only";
import { timingSafeEqual } from "node:crypto";

import { hashRecoveryCode, matchTotp, newRecoveryCodes, newTotpSecret, otpauthUri } from "@/features/auth/model/totp";
import { ensureSchema, getPool } from "@/shared/api/db";
import { isRecord, readString, readStrings } from "@/shared/lib/guards";
import { openRecord, sealedIn, sealRecord } from "@/shared/lib/secrets";

export interface TwoFactorRecord {
  secret?: string;
  pending?: string;
  recovery?: string[];
}

// The last step used by each account, so a code works only once
const lastStep = new Map<string, number>();

// A stored two-factor record, with anything unexpected left out
export const twoFactorRecord = (value: unknown): TwoFactorRecord => {
  const record: TwoFactorRecord = {};
  const secret = readString(value, "secret");
  const pending = readString(value, "pending");
  if (secret) record.secret = secret;
  if (pending) record.pending = pending;
  if (isRecord(value) && Array.isArray(value.recovery)) record.recovery = readStrings(value, "recovery");
  return record;
};

// The account's two-factor record, empty when it has none
const load = async (userId: string): Promise<TwoFactorRecord> => {
  await ensureSchema();
  const res = await getPool().query<{ two_factor: string | null }>(`SELECT two_factor FROM users WHERE id = $1`, [
    userId,
  ]);
  return twoFactorRecord(openRecord(res.rows[0]?.two_factor, sealedIn.twoFactor(userId)));
};

// Stores the record sealed, or clears it when nothing is set up
const save = async (userId: string, record: TwoFactorRecord): Promise<void> => {
  const empty = !record.secret && !record.pending;
  await getPool().query(`UPDATE users SET two_factor = $2 WHERE id = $1`, [
    userId,
    empty ? null : sealRecord(record, sealedIn.twoFactor(userId)),
  ]);
};

// Whether a code is right and newer than the last one the account used
const acceptTotp = (userId: string, secret: string, code: string): boolean => {
  const step = matchTotp(secret, code, Date.now());
  if (step === null || step <= (lastStep.get(userId) ?? -1)) return false;
  lastStep.set(userId, step);
  return true;
};

// Which recovery code was typed, compared in constant time, or -1
const recoveryIndex = (record: TwoFactorRecord, code: string): number => {
  const wanted = Buffer.from(hashRecoveryCode(code));
  return (record.recovery ?? []).findIndex((hash) => {
    const have = Buffer.from(hash);
    return have.length === wanted.length && timingSafeEqual(have, wanted);
  });
};

// Whether the account asks for a code after the password
export const twoFactorEnabled = async (userId: string): Promise<boolean> => Boolean((await load(userId)).secret);

// A new secret to scan, kept pending until a code confirms it
export const beginTwoFactor = async (
  userId: string,
  account: string,
): Promise<{ secret: string; uri: string } | null> => {
  const record = await load(userId);
  if (record.secret) return null;
  const pending = newTotpSecret();
  await save(userId, { ...record, pending });
  return { secret: pending, uri: otpauthUri(pending, account) };
};

// Turns the pending secret on with a code and returns new recovery codes
export const confirmTwoFactor = async (userId: string, code: string): Promise<string[] | null> => {
  const record = await load(userId);
  if (record.secret || !record.pending || !acceptTotp(userId, record.pending, code)) return null;
  const codes = newRecoveryCodes();
  await save(userId, { secret: record.pending, recovery: codes.map(hashRecoveryCode) });
  return codes;
};

// Whether a code or an unused recovery code passes; a recovery code is spent
export const verifySecondFactor = async (userId: string, code: string): Promise<boolean> => {
  const record = await load(userId);
  if (!record.secret) return true;
  if (acceptTotp(userId, record.secret, code)) return true;
  const used = recoveryIndex(record, code);
  if (used < 0) return false;
  await save(userId, { ...record, recovery: (record.recovery ?? []).filter((_, i) => i !== used) });
  return true;
};

// Turns two-factor sign-in off after a code or recovery code
export const disableTwoFactor = async (userId: string, code: string): Promise<boolean> => {
  const record = await load(userId);
  if (!record.secret) return true;
  if (!acceptTotp(userId, record.secret, code) && recoveryIndex(record, code) < 0) return false;
  await save(userId, {});
  return true;
};
