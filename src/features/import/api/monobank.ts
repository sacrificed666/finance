import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { ensureSchema, getPool } from "@/shared/api/db";
import { isRecord, readArray, readNumber, readString, readStrings, readText } from "@/shared/lib/guards";
import type { Currency } from "@/shared/lib/money";
import { openRecord, sealedIn, sealRecord } from "@/shared/lib/secrets";

const API = "https://api.monobank.ua";

// The currencies Monobank names by ISO 4217 number
const CURRENCY_CODES: Partial<Record<number, Currency>> = { 980: "UAH", 840: "USD", 978: "EUR" };

export const MONO_SPACING_MS = 61_000;
export const MONO_MAX_RANGE_S = 31 * 86_400 + 3_600;

export interface MonoAccount {
  id: string;
  kind: "card" | "jar";
  currency: Currency | null;
  type: string;
  maskedPan: string;
  title?: string;
  // The money of your own on it, the bank's credit limit left out
  balance: number;
  balanceAt?: number;
  creditLimit?: number;
}

export interface MonoItem {
  id: string;
  time: number;
  description: string;
  comment?: string;
  mcc: number;
  amount: number;
  opAmount?: number;
  opCurrency?: Currency;
  balance?: number;
}

export interface MonoStored {
  token: string;
  name?: string;
  accounts?: MonoAccount[];
  fetchedAt?: number;
  webhookKey?: string;
  webhookUrl?: string;
}

const BANK_TIME_ZONE = "Europe/Kyiv";

// The date of a bank moment in Kyiv, as 2026-04-15
export const monoDate = (unix: number): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: BANK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(unix * 1000));

// A failed bank call with the status to answer the browser with
export class MonoError extends Error {
  readonly status: number;

  // Keeps the status to answer with
  constructor(status: number, message: string) {
    super(message);
    this.name = "MonoError";
    this.status = status;
  }
}

// When each account last called the bank, which allows one call a minute
const lastCall = new Map<string, number>();

// How long the account must wait before calling the bank again
export const monoWait = (userId: string): number =>
  Math.max(0, (lastCall.get(userId) ?? 0) + MONO_SPACING_MS - Date.now());

// A currency by its ISO number, or null for one the app does not keep
const currencyOf = (code: number | null): Currency | null => (code === null ? null : (CURRENCY_CODES[code] ?? null));

// One call to the bank, spaced a minute apart, with its answer as parsed JSON
const call = async (userId: string, token: string, path: string, body?: unknown): Promise<unknown> => {
  const wait = monoWait(userId);
  if (wait > 0) throw new MonoError(429, `wait:${String(Math.ceil(wait / 1000))}`);
  lastCall.set(userId, Date.now());
  const res = await fetch(`${API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? { "X-Token": token } : { "X-Token": token, "Content-Type": "application/json" },
    body: body === undefined ? null : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 403 || res.status === 401) throw new MonoError(403, "token");
  if (res.status === 429) throw new MonoError(429, "wait:60");
  if (!res.ok) throw new MonoError(502, `monobank:${String(res.status)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : {};
};

// A stored card or jar, older ones without a kind being cards, or null
const storedAccount = (value: unknown): MonoAccount | null => {
  const id = readString(value, "id");
  if (id === null || !isRecord(value)) return null;
  const { currency } = value;
  const account: MonoAccount = {
    id,
    kind: value.kind === "jar" ? "jar" : "card",
    currency: currency === "UAH" || currency === "USD" || currency === "EUR" ? currency : null,
    type: readText(value, "type") ?? "",
    maskedPan: readText(value, "maskedPan") ?? "",
    balance: readNumber(value, "balance") ?? 0,
  };
  const title = readText(value, "title");
  const balanceAt = readNumber(value, "balanceAt");
  const creditLimit = readNumber(value, "creditLimit");
  if (title !== null) account.title = title;
  if (balanceAt !== null) account.balanceAt = balanceAt;
  if (creditLimit !== null && creditLimit > 0) account.creditLimit = creditLimit;
  return account;
};

// The stored connection, or null when the record is not one
const storedMono = (value: unknown): MonoStored | null => {
  const token = readString(value, "token");
  if (token === null) return null;
  const stored: MonoStored = { token };
  const name = readText(value, "name");
  const fetchedAt = readNumber(value, "fetchedAt");
  const webhookKey = readString(value, "webhookKey");
  const webhookUrl = readString(value, "webhookUrl");
  if (name !== null) stored.name = name;
  if (isRecord(value) && Array.isArray(value.accounts)) {
    stored.accounts = readArray(value, "accounts").flatMap((entry) => storedAccount(entry) ?? []);
  }
  if (fetchedAt !== null) stored.fetchedAt = fetchedAt;
  if (webhookKey !== null) stored.webhookKey = webhookKey;
  if (webhookUrl !== null) stored.webhookUrl = webhookUrl;
  return stored;
};

// The account's Monobank connection, or null when it has none
export const loadMono = async (userId: string): Promise<MonoStored | null> => {
  await ensureSchema();
  const res = await getPool().query<{ secret: string | null }>(
    `SELECT secret FROM integrations WHERE user_id = $1 AND provider = 'monobank'`,
    [userId],
  );
  const [row] = res.rows;
  return row ? storedMono(openRecord(row.secret, sealedIn.integration(userId, "monobank"))) : null;
};

// Stores the connection sealed
const saveMono = async (userId: string, stored: MonoStored): Promise<void> => {
  await getPool().query(
    `INSERT INTO integrations (user_id, provider, secret, webhook_hash, updated_at)
     VALUES ($1, 'monobank', $2, $3, now())
     ON CONFLICT (user_id, provider) DO UPDATE
       SET secret = EXCLUDED.secret, webhook_hash = EXCLUDED.webhook_hash, updated_at = now()`,
    [userId, sealRecord(stored, sealedIn.integration(userId, "monobank")), webhookHashOf(stored)],
  );
};

// The SHA-256 of a webhook key, which is random enough not to need a salt
const keyHash = (key: string): string => createHash("sha256").update(key).digest("hex");

// The hash a connection's webhook is found by, or empty while it is off
const webhookHashOf = (stored: MonoStored): string =>
  stored.webhookKey && stored.webhookUrl ? keyHash(stored.webhookKey) : "";

// Forgets the account's Monobank connection
export const deleteMono = async (userId: string): Promise<void> => {
  await ensureSchema();
  await getPool().query(`DELETE FROM integrations WHERE user_id = $1 AND provider = 'monobank'`, [userId]);
};

// A card from the client info in whole units, its own money apart from the limit
const cardFrom = (value: unknown, now: number): MonoAccount | null => {
  const id = readString(value, "id");
  const balance = readNumber(value, "balance");
  if (id === null || balance === null) return null;
  const creditLimit = Math.max(0, readNumber(value, "creditLimit") ?? 0);
  const card: MonoAccount = {
    id,
    kind: "card",
    currency: currencyOf(readNumber(value, "currencyCode")),
    type: readString(value, "type") ?? "black",
    maskedPan: readStrings(value, "maskedPan")[0] ?? "",
    balance: (balance - creditLimit) / 100,
    balanceAt: now,
  };
  if (creditLimit > 0) card.creditLimit = creditLimit / 100;
  return card;
};

// A jar from the client info, with its balance in whole units
const jarFrom = (value: unknown, now: number): MonoAccount | null => {
  const id = readString(value, "id");
  const balance = readNumber(value, "balance");
  if (id === null || balance === null) return null;
  const account: MonoAccount = {
    id,
    kind: "jar",
    currency: currencyOf(readNumber(value, "currencyCode")),
    type: "jar",
    maskedPan: "",
    balance: balance / 100,
    balanceAt: now,
  };
  const title = readText(value, "title");
  if (title !== null) account.title = title.slice(0, 80);
  return account;
};

// Connects with a token: reads the owner, cards and jars and stores them
export const connectMono = async (userId: string, token: string): Promise<MonoStored> => {
  const info = await call(userId, token, "/personal/client-info");
  const previous = await loadMono(userId);
  const now = Math.floor(Date.now() / 1000);
  const stored: MonoStored = {
    token,
    accounts: [
      ...readArray(info, "accounts").flatMap((entry) => cardFrom(entry, now) ?? []),
      ...readArray(info, "jars").flatMap((entry) => jarFrom(entry, now) ?? []),
    ],
    fetchedAt: Date.now(),
  };
  const name = readText(info, "name");
  if (name !== null) stored.name = name;
  if (previous?.token === token) {
    if (previous.webhookKey) stored.webhookKey = previous.webhookKey;
    if (previous.webhookUrl) stored.webhookUrl = previous.webhookUrl;
  }
  await ensureSchema();
  await saveMono(userId, stored);
  return stored;
};

// A statement line from the bank in whole units, or null when it is not one
export const monoItem = (value: unknown): MonoItem | null => {
  const rawId = isRecord(value) ? value.id : null;
  const time = readNumber(value, "time");
  const amount = readNumber(value, "amount");
  if ((typeof rawId !== "string" && typeof rawId !== "number") || time === null || !Number.isInteger(time)) return null;
  if (amount === null) return null;
  const item: MonoItem = {
    id: String(rawId).slice(0, 80),
    time,
    description: (readText(value, "description") ?? "").slice(0, 200),
    mcc: readNumber(value, "mcc") ?? 0,
    amount: amount / 100,
  };
  const comment = readText(value, "comment");
  const operationAmount = readNumber(value, "operationAmount");
  const currency = currencyOf(readNumber(value, "currencyCode"));
  const balance = readNumber(value, "balance");
  if (comment !== null) item.comment = comment.slice(0, 200);
  if (operationAmount !== null) item.opAmount = Math.abs(operationAmount) / 100;
  if (currency !== null) item.opCurrency = currency;
  if (balance !== null) item.balance = balance / 100;
  return item;
};

// Keeps the newest balance the lines report, unless a newer one is stored
export const recordMonoBalance = async (userId: string, accountId: string, items: MonoItem[]): Promise<void> => {
  const latest = items.toSorted((a, b) => b.time - a.time).find((item) => item.balance !== undefined);
  const balance = latest?.balance;
  if (!latest || balance === undefined) return;
  const stored = await loadMono(userId);
  const accounts = stored?.accounts;
  const account = accounts?.find((entry) => entry.id === accountId);
  if (!stored || !accounts || !account || (account.balanceAt ?? 0) > latest.time) return;
  const own = balance - (account.creditLimit ?? 0);
  const updated: MonoAccount = Object.assign({}, account, { balance: own, balanceAt: latest.time });
  await saveMono(userId, { ...stored, accounts: accounts.map((entry) => (entry.id === accountId ? updated : entry)) });
};

// The lines of an account's statement between two moments
export const monoStatement = async (
  userId: string,
  token: string,
  account: string,
  from: number,
  to: number,
): Promise<MonoItem[]> => {
  const answer = await call(
    userId,
    token,
    `/personal/statement/${encodeURIComponent(account)}/${String(from)}/${String(to)}`,
  );
  return Array.isArray(answer) ? answer.flatMap((entry: unknown) => monoItem(entry) ?? []) : [];
};

// Points the bank's webhook at this site, or turns it off without an origin
export const setMonoWebhook = async (userId: string, origin: string | null): Promise<MonoStored> => {
  const stored = await loadMono(userId);
  if (!stored) throw new MonoError(409, "not-connected");
  const webhookKey = stored.webhookKey ?? randomBytes(24).toString("base64url");
  const url = origin ? `${origin.replace(/\/$/u, "")}/api/monobank/webhook/${webhookKey}` : "";
  await saveMono(userId, { ...stored, webhookKey });
  await call(userId, stored.token, "/personal/webhook", { webHookUrl: url });
  const next: MonoStored = { ...stored, webhookKey };
  if (url) next.webhookUrl = url;
  else delete next.webhookUrl;
  await saveMono(userId, next);
  return next;
};

// The account a webhook key belongs to, found by hash, compared in constant time
export const findMonoByWebhookKey = async (key: string): Promise<{ userId: string; stored: MonoStored } | null> => {
  if (!/^[\w-]{20,64}$/u.test(key)) return null;
  await ensureSchema();
  const res = await getPool().query<{ user_id: string; secret: string | null }>(
    `SELECT user_id, secret FROM integrations WHERE provider = 'monobank' AND webhook_hash = $1`,
    [keyHash(key)],
  );
  const wanted = Buffer.from(key);
  for (const row of res.rows) {
    const stored = storedMono(openRecord(row.secret, sealedIn.integration(row.user_id, "monobank")));
    if (!stored?.webhookKey || !stored.webhookUrl) continue;
    const have = Buffer.from(stored.webhookKey);
    if (have.length === wanted.length && timingSafeEqual(have, wanted)) return { userId: row.user_id, stored };
  }
  return null;
};

// What the browser may see of the connection: never the token or webhook key
export const publicMono = (stored: MonoStored | null) =>
  stored
    ? {
        connected: true,
        name: stored.name ?? "",
        accounts: stored.accounts ?? [],
        fetchedAt: stored.fetchedAt ?? null,
        webhook: Boolean(stored.webhookUrl),
      }
    : { connected: false, name: "", accounts: [], fetchedAt: null, webhook: false };
