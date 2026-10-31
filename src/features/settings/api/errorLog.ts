import { Pool } from "pg";

import { log } from "@/shared/lib/log";

const KEEP = 200;

// The app's pool when it is up, or a small one of its own for errors
const pool = (): Pool | null => {
  globalThis.financeDb ??= {};
  const store = globalThis.financeDb;
  if (store.pool) return store.pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  store.errorPool ??= new Pool({ connectionString: url, max: 1 });
  return store.errorPool;
};

// An error as one short line
export const errorText = (error: unknown): string => {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return text.replaceAll(/\s+/gu, " ").trim().slice(0, 500);
};

// Logs a server error and keeps the latest ones for the owner's settings page
export const logError = async (route: string, error: unknown, digest?: string): Promise<void> => {
  log.error(route, { error: errorText(error), stack: error instanceof Error ? error.stack : undefined });
  const db = pool();
  if (!db) return;
  await db
    .query(`INSERT INTO app_errors (route, message, digest) VALUES ($1, $2, $3)`, [
      route.slice(0, 200),
      errorText(error),
      digest ?? null,
    ])
    .then(() =>
      db.query(`DELETE FROM app_errors WHERE id <= (SELECT id FROM app_errors ORDER BY id DESC OFFSET $1 LIMIT 1)`, [
        KEEP,
      ]),
    )
    .catch(() => {});
};
