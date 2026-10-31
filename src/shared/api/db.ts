import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { Pool, type PoolClient } from "pg";

interface DbCache {
  pool?: Pool;
  schema?: Promise<void>;
  errorPool?: Pool;
}

declare global {
  // The pool and schema setup, kept across hot reloads in development
  var financeDb: DbCache | undefined;
}

// The cache shared by every copy of this module
const cache = (): DbCache => {
  globalThis.financeDb ??= {};
  return globalThis.financeDb;
};

// The one connection pool to DATABASE_URL
export const getPool = (): Pool => {
  const store = cache();
  if (!store.pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set, so the app cannot reach Postgres. Copy .env.example to .env (make env).",
      );
    }
    store.pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    });
  }
  return store.pool;
};

// Applies db/schema.sql once; a failure lets the next call try again
export const ensureSchema = (): Promise<void> => {
  const store = cache();
  store.schema ??= readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8")
    .then(async (sql) => {
      await getPool().query(sql);
    })
    .catch((error: unknown) => {
      store.schema = undefined;
      throw error;
    });
  return store.schema;
};

// Runs the work in one transaction, rolled back when it throws
export const withTransaction = async <T>(work: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};
