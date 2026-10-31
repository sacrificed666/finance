import type { AppState, Transaction } from "@/features/data/model/types";

export interface FiscalReceipt {
  fn: string;
  id: string;
  amount: number;
  date: string;
  time?: string;
}

// The tax service's receipt check, which every fiscal QR code links to
const CHECK_HOST = /(^|\.)tax\.gov\.ua$/u;

// A day written as 20260915, as ISO, or null when the calendar has no such day
const dayOf = (text: string | null): string | null => {
  const match = /^(\d{4})(\d{2})(\d{2})$/u.exec(text ?? "");
  if (!match) return null;
  const [, year = "", month = "", day = ""] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCMonth() + 1 === Number(month) && date.getUTCDate() === Number(day)
    ? `${year}-${month}-${day}`
    : null;
};

// A time written as 1130 or 113045, as 11:30
const timeOf = (text: string | null): string | undefined => {
  const match = /^(\d{2})(\d{2})(\d{2})?$/u.exec(text ?? "");
  return match ? `${match[1] ?? ""}:${match[2] ?? ""}` : undefined;
};

// The receipt a fiscal QR code names: its register, number, sum, day and time
export const parseFiscalQr = (text: string): FiscalReceipt | null => {
  if (!URL.canParse(text.trim())) return null;
  const url = new URL(text.trim());
  if (!CHECK_HOST.test(url.hostname)) return null;
  const params = url.searchParams;
  const fn = params.get("fn") ?? "";
  const id = params.get("id") ?? "";
  const amount = Number((params.get("sm") ?? "").replace(",", "."));
  const date = dayOf(params.get("date"));
  if (!/^\d{1,20}$/u.test(fn) || !/^[\w.-]{1,40}$/u.test(id) || !date) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { fn, id, amount: Math.round(amount * 100) / 100, date, time: timeOf(params.get("time")) };
};

// The entry already made from this very receipt, if any
export const receiptEntry = (state: AppState, receipt: FiscalReceipt): Transaction | undefined =>
  state.transactions.find((tx) => tx.receipt?.fn === receipt.fn && tx.receipt.id === receipt.id);

// The latest entry from the same shop's register, to fill a new one like it
export const shopEntry = (state: AppState, receipt: FiscalReceipt): Transaction | undefined =>
  state.transactions
    .filter((tx) => tx.receipt?.fn === receipt.fn)
    .toSorted((a, b) => b.date.localeCompare(a.date))
    .at(0);
