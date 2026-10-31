import "server-only";
import { randomUUID } from "node:crypto";

import { ensureSchema, getPool } from "@/shared/api/db";
import { sealedIn, sealRecord } from "@/shared/lib/secrets";

// Creates an account with a sealed profile; false when the email is taken
export const createAccount = async (email: string, passwordHash: string, name: string | null): Promise<boolean> => {
  const profile = { name, image: null, about: null, occupation: null, location: null, website: null, birthday: null };
  await ensureSchema();
  const id = randomUUID();
  const res = await getPool().query<{ id: string }>(
    `INSERT INTO users (id, email, profile_secret, password_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [id, email, sealRecord(profile, sealedIn.profile(id)), passwordHash],
  );
  return res.rowCount !== 0;
};

// The account's password hash, or null when it signs in another way
export const passwordHashOf = async (userId: string): Promise<string | null> => {
  await ensureSchema();
  const res = await getPool().query<{ password_hash: string | null }>(`SELECT password_hash FROM users WHERE id = $1`, [
    userId,
  ]);
  return res.rows[0]?.password_hash ?? null;
};

// Stores a new password hash for the account
export const setPasswordHash = async (userId: string, hash: string): Promise<void> => {
  await ensureSchema();
  await getPool().query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [userId, hash]);
};

// Whether an account with this email exists already
export const accountExists = async (email: string): Promise<boolean> => {
  await ensureSchema();
  const res = await getPool().query(`SELECT 1 FROM users WHERE lower(email) = $1`, [email.trim().toLowerCase()]);
  return res.rows.length > 0;
};
