import "server-only";
import { ensureSchema, getPool } from "@/shared/api/db";

export interface StoredError {
  at: string;
  route: string;
  message: string;
}

// The latest server errors and how many are kept
export const recentErrors = async (): Promise<{ errors: StoredError[]; total: number }> => {
  await ensureSchema();
  const res = await getPool().query<StoredError>(
    `SELECT to_char(at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS at, route, message FROM app_errors ORDER BY id DESC LIMIT 30`,
  );
  const total = await getPool().query<{ n: string }>(`SELECT count(*) AS n FROM app_errors`);
  return { errors: res.rows, total: Number(total.rows[0]?.n ?? 0) };
};

// Forgets every kept server error
export const clearErrors = async (): Promise<void> => {
  await ensureSchema();
  await getPool().query(`DELETE FROM app_errors`);
};
