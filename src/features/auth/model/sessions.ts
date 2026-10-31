import "server-only";
import { ensureSchema, getPool } from "@/shared/api/db";
import { readNumber, readString } from "@/shared/lib/guards";

const CACHE_MS = 30_000;

export interface SessionState {
  epoch: number;
  keeper: string | null;
}

// Each account's epoch and keeper, null once the account is gone, and when read
const cache = new Map<string, { state: SessionState | null; at: number }>();

// The epoch and keeper of a database row, zero and none when they are empty
const stateOf = (row: unknown): SessionState => ({
  epoch: readNumber(row, "session_epoch") ?? 0,
  keeper: readString(row, "epoch_keeper"),
});

// The account's session epoch and the sign-in that outlived its last rise
export const sessionState = async (userId: string): Promise<SessionState | null> => {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.state;
  await ensureSchema();
  const res = await getPool().query(`SELECT session_epoch, epoch_keeper FROM users WHERE id = $1`, [userId]);
  const state = res.rows.length > 0 ? stateOf(res.rows[0]) : null;
  cache.set(userId, { state, at: Date.now() });
  return state;
};

// Moves the epoch on, keeping one sign-in's session or none
const raiseEpoch = async (userId: string, keeper: string | null): Promise<void> => {
  await ensureSchema();
  const res = await getPool().query(
    `UPDATE users SET session_epoch = session_epoch + 1, epoch_keeper = $2 WHERE id = $1
     RETURNING session_epoch, epoch_keeper`,
    [userId, keeper],
  );
  cache.set(userId, { state: res.rows.length > 0 ? stateOf(res.rows[0]) : null, at: Date.now() });
};

// Signs the account out everywhere by moving its epoch on
export const endAllSessions = (userId: string): Promise<void> => raiseEpoch(userId, null);

// Signs the account out everywhere but the sign-in that asked
export const endOtherSessions = (userId: string, keeper: string | null): Promise<void> => raiseEpoch(userId, keeper);
