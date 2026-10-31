import type { MonoLine } from "@/features/import/model/import";
import { isRecord, readArray, readNumber, readString } from "@/shared/lib/guards";
import { CURRENCIES, type Currency } from "@/shared/lib/money";

export interface BankAccount {
  id: string;
  kind: "card" | "jar";
  currency: Currency | null;
  type: string;
  maskedPan: string;
  title?: string;
  balance: number;
  balanceAt?: number;
  creditLimit?: number;
}

export interface BankStatus {
  connected: boolean;
  name: string;
  accounts: BankAccount[];
  fetchedAt: number | null;
  webhook: boolean;
}

// One account of the server's answer, or null when it is malformed
const accountOf = (value: unknown): BankAccount | null => {
  const id = readString(value, "id");
  const balance = readNumber(value, "balance");
  if (!id || balance === null) return null;
  const currency = isRecord(value) ? value.currency : undefined;
  return {
    id,
    kind: readString(value, "kind") === "jar" ? "jar" : "card",
    currency: CURRENCIES.find((code) => code === currency) ?? null,
    type: readString(value, "type") ?? "",
    maskedPan: readString(value, "maskedPan") ?? "",
    title: readString(value, "title") ?? undefined,
    balance,
    balanceAt: readNumber(value, "balanceAt") ?? undefined,
    creditLimit: readNumber(value, "creditLimit") ?? undefined,
  };
};

// The linked bank as the app's server describes it
export const bankStatusOf = (body: unknown): BankStatus => ({
  connected: isRecord(body) && body.connected === true,
  name: readString(body, "name") ?? "",
  accounts: readArray(body, "accounts").flatMap((item) => {
    const account = accountOf(item);
    return account ? [account] : [];
  }),
  fetchedAt: readNumber(body, "fetchedAt"),
  webhook: isRecord(body) && body.webhook === true,
});

// The linked bank and its accounts, or null when the server does not answer
export const fetchBankStatus = async (): Promise<BankStatus | null> => {
  const response = await fetch("/api/monobank", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;
  return bankStatusOf(await response.json().catch(() => null));
};

export type BankRefresh = { status: BankStatus } | { waitSeconds: string } | { failed: true };

// Asks the bank for fresh balances; Monobank answers once a minute
export const refreshBankStatus = async (token?: string): Promise<BankRefresh> => {
  const response = await fetch("/api/monobank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(token ? { token } : {}),
  }).catch(() => null);
  const body: unknown = await response?.json().catch(() => null);
  if (response?.ok) return { status: bankStatusOf(body) };
  const error = readString(body, "error");
  if (error?.startsWith("wait:")) return { waitSeconds: error.slice(5) };
  return { failed: true };
};

export type BankProblem =
  | { kind: "token" }
  | { kind: "https" }
  | { kind: "wait"; seconds: number }
  | { kind: "failed" };

// Why the server refused a bank request
const problemOf = (body: unknown): BankProblem => {
  const code = readString(body, "error") ?? "";
  if (code === "token") return { kind: "token" };
  if (code === "https") return { kind: "https" };
  if (code.startsWith("wait:")) return { kind: "wait", seconds: Number(code.slice(5)) || 60 };
  return { kind: "failed" };
};

export type BankAnswer = { ok: true; status: BankStatus } | { ok: false; problem: BankProblem };

// Sends JSON to a bank address and reads the linked bank back
const sendBank = async (url: string, payload: object): Promise<BankAnswer> => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
  const body: unknown = await response?.json().catch(() => null);
  if (response?.ok) return { ok: true, status: bankStatusOf(body) };
  return { ok: false, problem: response ? problemOf(body) : { kind: "failed" } };
};

// Links the bank with a personal token
export const connectBank = (token: string): Promise<BankAnswer> => sendBank("/api/monobank", { token });

// Turns the bank's instant updates on or off
export const setBankWebhook = (on: boolean): Promise<BankAnswer> => sendBank("/api/monobank/webhook", { on });

// Unlinks the bank
export const disconnectBank = async (): Promise<void> => {
  await fetch("/api/monobank", { method: "DELETE" }).catch(() => null);
};

// A currency the app keeps, or nothing
const currencyOf = (value: unknown): Currency | undefined => CURRENCIES.find((code) => code === value);

// An operation of a statement, or null when it is malformed
const lineOf = (row: unknown): MonoLine | null => {
  const id = readString(row, "id");
  const time = readNumber(row, "time");
  const mcc = readNumber(row, "mcc");
  const amount = readNumber(row, "amount");
  if (!id || time === null || amount === null) return null;
  return {
    id,
    time,
    description: readString(row, "description") ?? "",
    comment: readString(row, "comment") ?? undefined,
    mcc: mcc ?? 0,
    amount,
    opAmount: readNumber(row, "opAmount") ?? undefined,
    opCurrency: currencyOf(isRecord(row) ? row.opCurrency : undefined),
  };
};

export type StatementAnswer = { ok: true; items: MonoLine[] } | { ok: false; problem: BankProblem };

// One account's operations between two moments, in seconds
export const fetchStatement = async (account: string, from: number, to: number): Promise<StatementAnswer> => {
  const query = `account=${encodeURIComponent(account)}&from=${String(from)}&to=${String(to)}`;
  const response = await fetch(`/api/monobank/statement?${query}`).catch(() => null);
  const body: unknown = await response?.json().catch(() => null);
  if (!response?.ok) return { ok: false, problem: response ? problemOf(body) : { kind: "failed" } };
  return {
    ok: true,
    items: readArray(body, "items")
      .map(lineOf)
      .filter((line) => line !== null),
  };
};

// The span from some days ago until now, in seconds as the bank counts time
export const lastDays = (days: number): { from: number; to: number } => {
  const to = Math.floor(Date.now() / 1000);
  return { from: to - days * 86_400, to };
};

// Waits a second
const second = () => new Promise((resolve) => setTimeout(resolve, 1000));

export interface StatementHooks {
  stopped: () => boolean;
  onLoad: () => void;
  onWait: (seconds: number) => void;
}

// Counts a wait down a second at a time, false when stopped on the way
const countDown = async (seconds: number, hooks: StatementHooks): Promise<boolean> => {
  if (hooks.stopped()) return false;
  if (seconds <= 0) return true;
  hooks.onWait(seconds);
  await second();
  return countDown(seconds - 1, hooks);
};

// An account's statement, waiting out the bank's limit as often as it asks
export const loadStatement = async (
  account: string,
  from: number,
  to: number,
  hooks: StatementHooks,
): Promise<StatementAnswer | null> => {
  if (hooks.stopped()) return null;
  hooks.onLoad();
  const answer = await fetchStatement(account, from, to);
  if (answer.ok || answer.problem.kind !== "wait") return answer;
  return (await countDown(answer.problem.seconds, hooks)) ? loadStatement(account, from, to, hooks) : null;
};
