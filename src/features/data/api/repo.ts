import "server-only";
import type { PoolClient } from "pg";

import {
  applyChanges,
  collectionsOf,
  COLLECTION_NAMES,
  keyOf,
  stableJson,
  type CollectionChanges,
  type CollectionName,
  type Collections,
  type ItemOf,
  type StateChanges,
} from "@/features/data/model/changes";
import { normalizeState } from "@/features/data/model/normalize";
import type { AppState } from "@/features/data/model/types";
import { pruneAttachments } from "@/features/transactions/api/attachments";
import { isUntouchedPlan, materializeRecurring, rememberSkipped } from "@/features/transactions/model/schedules";
import { ensureSchema, getPool, withTransaction } from "@/shared/api/db";
import type { Locale } from "@/shared/i18n/locales";
import { todayISO } from "@/shared/lib/date";
import { isRecord, readString } from "@/shared/lib/guards";
import { openRecord, sealedIn, sealRecord } from "@/shared/lib/secrets";
import { mapInOrder } from "@/shared/lib/sequence";

export interface StateEnvelope {
  state: AppState;
  revision: string;
}

interface Queryable {
  query: PoolClient["query"];
}

// A record as it is stored: its collection, its key and the sealed item
interface StoredRecord {
  collection: CollectionName;
  id: string;
  secret: string;
}

// Records per statement, well below the 65,535 parameters Postgres takes
const BATCH = 1000;

// The revision of a settings row, to the microsecond
const REVISION = `to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.USZ')`;

// The revision of the account's state, locking its row until the transaction ends
async function currentRevision(client: PoolClient, userId: string): Promise<string> {
  const res = await client.query(`SELECT ${REVISION} AS revision FROM settings WHERE user_id = $1 FOR UPDATE`, [
    userId,
  ]);
  return res.rows[0]?.revision ?? "";
}

// The revision of the account's state, empty before its first save
export async function stateRevision(userId: string): Promise<string> {
  await ensureSchema();
  const res = await getPool().query(`SELECT ${REVISION} AS revision FROM settings WHERE user_id = $1`, [userId]);
  return res.rows[0]?.revision ?? "";
}

// The account's whole state, normalized, with its revision
export async function loadState(userId: string, fallbackLocale: Locale = "en"): Promise<StateEnvelope> {
  await ensureSchema();
  const { state, revision } = await loadStateWith(getPool(), userId, fallbackLocale);
  return { state: materializeRecurring(state), revision };
}

// A value to spread: the record itself, or nothing when it is not one
const recordOf = (value: unknown) => (isRecord(value) ? value : {});

// An opened state with the keys of each collection the records table holds
interface OpenedState extends StateEnvelope {
  stored: ReadonlyMap<string, ReadonlySet<string>>;
}

// How many accounts' opened states the server keeps between requests
const OPENED_LIMIT = 16;

// The states opened lately by account, valid while their revision stands
const opened = new Map<string, OpenedState>();

// Keeps an account's opened state, forgetting the least recent past the limit
const remember = (userId: string, state: OpenedState): void => {
  opened.delete(userId);
  if (state.revision === "") return;
  opened.set(userId, state);
  const oldest = opened.keys().next();
  if (opened.size > OPENED_LIMIT && !oldest.done) opened.delete(oldest.value);
};

// Forgets every opened state, as after restoring a backup into a running server
export const forgetOpenedStates = (): void => opened.clear();

// The state read through any connection, or the one opened last at this revision
async function loadStateWith(conn: Queryable, userId: string, fallbackLocale: Locale): Promise<OpenedState> {
  const settings = await conn.query<{ locale: string | null; secret: string; revision: string }>(
    `SELECT locale, secret, ${REVISION} AS revision FROM settings WHERE user_id = $1`,
    [userId],
  );
  const s = settings.rows[0];
  const hit = opened.get(userId);
  if (s?.locale && hit?.revision === s.revision) return hit;
  const records = await conn.query<{ collection: string; id: string; secret: string }>(
    `SELECT collection, id, secret FROM records WHERE user_id = $1`,
    [userId],
  );
  const items = new Map<string, unknown[]>();
  const stored = new Map<string, Set<string>>();
  for (const row of records.rows) {
    const keys = stored.get(row.collection) ?? new Set<string>();
    keys.add(row.id);
    stored.set(row.collection, keys);
    const item = openRecord(row.secret, sealedIn.record(userId, row.collection, row.id));
    if (item === null) continue;
    const list = items.get(row.collection) ?? [];
    list.push(item);
    items.set(row.collection, list);
  }
  const state = normalizeState({
    version: 1,
    ...Object.fromEntries(COLLECTION_NAMES.map((name) => [name, items.get(name) ?? []])),
    settings: { ...recordOf(openRecord(s?.secret, sealedIn.settings(userId))), locale: s?.locale ?? fallbackLocale },
  });
  const result: OpenedState = { state, revision: s?.revision ?? "", stored };
  if (s?.locale) remember(userId, result);
  return result;
}

// The keys a change set names in a collection, upserted or removed
const touchedKeys = <K extends CollectionName>(name: K, change: CollectionChanges[K]): Set<string> => {
  if (!change) return new Set();
  const upserted = change.upsert.map((item) => keyOf(name, item)).filter((key) => typeof key === "string");
  return new Set([...upserted, ...change.remove]);
};

// The records a change touched, those the table lacks and those it need not keep
const differences = <K extends CollectionName>(
  userId: string,
  name: K,
  before: Pick<Collections, K>,
  after: Pick<Collections, K>,
  touched: ReadonlySet<string>,
  stored: ReadonlySet<string>,
  worthKeeping: (key: string) => boolean,
): { changed: StoredRecord[]; removed: Array<Omit<StoredRecord, "secret">> } => {
  // The item's key in its collection
  const k = (item: ItemOf<K>) => keyOf(name, item);
  const previous = new Map(before[name].map((item) => [k(item), item]));
  const next = new Map(after[name].map((item) => [k(item), item]));
  const dropped = [...next.keys()].filter((key) => stored.has(key) && !worthKeeping(key));
  const candidates = new Set([...touched, ...[...next.keys()].filter((key) => !stored.has(key)), ...dropped]);
  const changed: StoredRecord[] = [];
  const removed: Array<Omit<StoredRecord, "secret">> = [];
  for (const key of candidates) {
    const item = next.get(key);
    const old = previous.get(key);
    if (item === undefined || !worthKeeping(key)) {
      if (stored.has(key)) removed.push({ collection: name, id: key });
    } else if (!stored.has(key) || old === undefined || stableJson(old) !== stableJson(item)) {
      changed.push({ collection: name, id: key, secret: sealRecord(item, sealedIn.record(userId, name, key)) });
    }
  }
  return { changed, removed };
};

// The list cut into batches of BATCH items
const batches = <T>(items: readonly T[]): T[][] =>
  Array.from({ length: Math.ceil(items.length / BATCH) }, (_, i) => items.slice(i * BATCH, (i + 1) * BATCH));

// Inserts or replaces sealed records; the last of a repeated key wins
async function upsertRecords(client: PoolClient, userId: string, rows: readonly StoredRecord[]): Promise<void> {
  const unique = [...new Map(rows.map((row) => [`${row.collection}/${row.id}`, row])).values()];
  await mapInOrder(batches(unique), (batch) => {
    const values: unknown[] = [userId];
    // The placeholder of the next value
    const next = (value: unknown) => `$${String(values.push(value))}`;
    const tuples = batch.map((row) => `($1, ${next(row.collection)}, ${next(row.id)}, ${next(row.secret)})`);
    return client.query(
      `INSERT INTO records (user_id, collection, id, secret) VALUES ${tuples.join(", ")}
       ON CONFLICT (user_id, collection, id) DO UPDATE SET secret = EXCLUDED.secret`,
      values,
    );
  });
}

// Deletes records by collection and key
async function removeRecords(
  client: PoolClient,
  userId: string,
  rows: ReadonlyArray<Omit<StoredRecord, "secret">>,
): Promise<void> {
  await mapInOrder(batches(rows), (batch) =>
    client.query(
      `DELETE FROM records r
        USING unnest($2::text[], $3::text[]) AS gone (collection, id)
        WHERE r.user_id = $1 AND r.collection = gone.collection AND r.id = gone.id`,
      [userId, batch.map((row) => row.collection), batch.map((row) => row.id)],
    ),
  );
}

export interface SaveResult {
  revision: string;
  stale: boolean;
  written: number;
}

// Merges changes into the stored state and writes only what differs
export async function saveChanges(
  userId: string,
  changes: StateChanges,
  baseRevision: string | null,
  fallbackLocale: Locale = "en",
): Promise<SaveResult> {
  await ensureSchema();
  return withTransaction(async (client) => {
    const stored = await currentRevision(client, userId);
    const current = await loadStateWith(client, userId, fallbackLocale);
    const base = materializeRecurring(current.state);
    const merged = materializeRecurring(rememberSkipped(base, normalizeState(applyChanges(base, changes))));
    const stale = baseRevision !== null && stored !== "" && baseRevision !== stored;
    const today = todayISO();
    const untouched = new Set(
      merged.transactions.filter((tx) => isUntouchedPlan(merged, tx, today)).map((tx) => tx.id),
    );

    const found = COLLECTION_NAMES.map((name) =>
      differences(
        userId,
        name,
        collectionsOf(base),
        collectionsOf(merged),
        touchedKeys(name, changes[name]),
        current.stored.get(name) ?? new Set(),
        (key) => name !== "transactions" || !untouched.has(key),
      ),
    );
    const changed = found.flatMap((difference) => difference.changed);
    const removed = found.flatMap((difference) => difference.removed);
    const settingsChanged = stableJson(base.settings) !== stableJson(merged.settings);
    if (changed.length + removed.length === 0 && !settingsChanged && stored !== "") {
      return { revision: stored, stale, written: 0 };
    }

    await upsertRecords(client, userId, changed);
    await removeRecords(client, userId, removed);
    if (changes.transactions) {
      await pruneAttachments(
        client,
        userId,
        merged.transactions.flatMap((tx) => tx.attachmentIds ?? []),
      );
    }

    const res = await client.query(
      `INSERT INTO settings (user_id, locale, secret, updated_at) VALUES ($1, $2, $3, clock_timestamp())
       ON CONFLICT (user_id) DO UPDATE
         SET locale = EXCLUDED.locale, secret = EXCLUDED.secret, updated_at = clock_timestamp()
       RETURNING ${REVISION} AS revision`,
      [userId, merged.settings.locale, sealRecord(merged.settings, sealedIn.settings(userId))],
    );
    const revision = readString(res.rows[0], "revision") ?? "";
    remember(userId, { state: merged, revision, stored: storedAfter(current.stored, changed, removed) });
    const written = changed.length + removed.length + 1;
    return { revision, stale, written };
  });
}

// The keys the table holds once some records are written and others removed
const storedAfter = (
  before: ReadonlyMap<string, ReadonlySet<string>>,
  changed: readonly StoredRecord[],
  removed: ReadonlyArray<Omit<StoredRecord, "secret">>,
): Map<string, Set<string>> => {
  const after = new Map([...before].map(([collection, keys]) => [collection, new Set(keys)]));
  for (const row of changed) after.set(row.collection, (after.get(row.collection) ?? new Set()).add(row.id));
  for (const row of removed) after.get(row.collection)?.delete(row.id);
  return after;
};
