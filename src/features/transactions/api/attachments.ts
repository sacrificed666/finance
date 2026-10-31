import "server-only";
import { randomUUID } from "node:crypto";

import { ensureSchema, getPool } from "@/shared/api/db";
import { readString } from "@/shared/lib/guards";
import { open, seal, sealedIn } from "@/shared/lib/secrets";

export const ATTACHMENT_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);
export const ATTACHMENT_MAX_BYTES = 1_500_000;

// What one account may keep in photos as stored, about half a gigabyte of images
export const ATTACHMENT_STORAGE_BYTES = 1_000_000_000;

interface Queryable {
  query: (sql: string, params: unknown[]) => Promise<unknown>;
}

// Stores a photo sealed like every secret and gives its id; null when full
export const saveAttachment = async (userId: string, mime: string, data: Buffer): Promise<string | null> => {
  await ensureSchema();
  const id = randomUUID();
  const secret = seal(data.toString("base64"), sealedIn.attachment(userId, id));
  const usage = await getPool().query<{ used: string | number }>(
    "SELECT coalesce(sum(octet_length(secret)), 0) AS used FROM attachments WHERE user_id = $1",
    [userId],
  );
  if (Number(usage.rows[0]?.used ?? 0) + secret.length > ATTACHMENT_STORAGE_BYTES) return null;
  await getPool().query("INSERT INTO attachments (user_id, id, mime, secret) VALUES ($1, $2, $3, $4)", [
    userId,
    id,
    mime,
    secret,
  ]);
  return id;
};

// A user's stored photo with its type, or null when it is gone
export const loadAttachment = async (userId: string, id: string): Promise<{ mime: string; data: Buffer } | null> => {
  await ensureSchema();
  const result = await getPool().query("SELECT mime, secret FROM attachments WHERE user_id = $1 AND id = $2", [
    userId,
    id,
  ]);
  const row: unknown = result.rows[0];
  const mime = readString(row, "mime");
  const secret = readString(row, "secret");
  const text = secret ? open(secret, sealedIn.attachment(userId, id)) : null;
  return mime && text ? { mime, data: Buffer.from(text, "base64") } : null;
};

// Deletes the photos no entry refers to, a day after they were stored
export const pruneAttachments = async (client: Queryable, userId: string, referenced: string[]): Promise<void> => {
  await client.query(
    `DELETE FROM attachments
      WHERE user_id = $1 AND id <> ALL($2::text[]) AND created_at < now() - interval '1 day'`,
    [userId, referenced],
  );
};
