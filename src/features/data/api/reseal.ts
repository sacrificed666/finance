import "server-only";
import type { PoolClient } from "pg";

import { ensureSchema, withTransaction } from "@/shared/api/db";
import { readText } from "@/shared/lib/guards";
import { log } from "@/shared/lib/log";
import { SEALED_PREFIX } from "@/shared/lib/sealing";
import { hasOlderKeys, resealed, sealedIn } from "@/shared/lib/secrets";
import { mapInOrder } from "@/shared/lib/sequence";

// Every table with an account's sealed rows, and where each row's value is kept
const SEALED_TABLES: ReadonlyArray<{
  table: string;
  columns: string;
  place: (userId: string, row: unknown) => string;
}> = [
  {
    table: "records",
    columns: "collection, id",
    place: (userId, row) => sealedIn.record(userId, readText(row, "collection") ?? "", readText(row, "id") ?? ""),
  },
  { table: "settings", columns: "user_id", place: (userId) => sealedIn.settings(userId) },
  {
    table: "attachments",
    columns: "id",
    place: (userId, row) => sealedIn.attachment(userId, readText(row, "id") ?? ""),
  },
  {
    table: "integrations",
    columns: "provider",
    place: (userId, row) => sealedIn.integration(userId, readText(row, "provider") ?? ""),
  },
  {
    table: "push_subscriptions",
    columns: "id",
    place: (userId, row) => sealedIn.push(userId, readText(row, "id") ?? ""),
  },
  { table: "passkeys", columns: "id", place: (userId, row) => sealedIn.passkey(userId, readText(row, "id") ?? "") },
  { table: "sign_ins", columns: "user_id", place: (userId) => sealedIn.signIn(userId) },
];

// The accounts already checked since the server started
const checked = new Set<string>();

// Reseals the account's rows of one table with the current key, and counts them
const resealTable = async (
  client: PoolClient,
  userId: string,
  { table, columns, place }: (typeof SEALED_TABLES)[number],
): Promise<number> => {
  const rows = await client.query<{ at: string; secret: string }>(
    `SELECT ctid::text AS at, secret, ${columns} FROM ${table} WHERE user_id = $1 AND secret LIKE $2 FOR UPDATE`,
    [userId, `${SEALED_PREFIX}%`],
  );
  const updates = rows.rows.flatMap((row) => {
    const next = resealed(row.secret, place(userId, row));
    return next ? [{ at: row.at, next }] : [];
  });
  await mapInOrder(updates, ({ at, next }) =>
    client.query(`UPDATE ${table} SET secret = $2 WHERE ctid = $1::tid`, [at, next]),
  );
  return updates.length;
};

// Seals the account's profile and two-factor records again, and counts them
const resealUser = async (client: PoolClient, userId: string): Promise<number> => {
  const user = await client.query<{ profile_secret: string | null; two_factor: string | null }>(
    `SELECT profile_secret, two_factor FROM users WHERE id = $1 FOR UPDATE`,
    [userId],
  );
  const profile = resealed(user.rows[0]?.profile_secret, sealedIn.profile(userId));
  const twoFactor = resealed(user.rows[0]?.two_factor, sealedIn.twoFactor(userId));
  if (!profile && !twoFactor) return 0;
  await client.query(
    `UPDATE users SET profile_secret = COALESCE($2, profile_secret), two_factor = COALESCE($3, two_factor) WHERE id = $1`,
    [userId, profile, twoFactor],
  );
  return (profile ? 1 : 0) + (twoFactor ? 1 : 0);
};

// Seals records of an older key again with the current one, once per account
export const resealOlderRecords = async (userId: string): Promise<number> => {
  if (!hasOlderKeys || checked.has(userId)) return 0;
  checked.add(userId);
  try {
    await ensureSchema();
    const count = await withTransaction(async (client) => {
      const written = await mapInOrder(SEALED_TABLES, (entry) => resealTable(client, userId, entry));
      return written.reduce((sum, n) => sum + n, 0) + (await resealUser(client, userId));
    });
    if (count > 0) log.info("Re-sealed records of one account with the current key", { count });
    return count;
  } catch (error) {
    checked.delete(userId);
    throw error;
  }
};
