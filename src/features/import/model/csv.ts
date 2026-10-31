import type { AppState, Category } from "@/features/data/model/types";
import { fingerprint, suggestCategory, type ImportCandidate } from "@/features/import/model/import";
import { CURRENCIES, type Currency } from "@/shared/lib/money";

export interface CsvMapping {
  date: number;
  description: number;
  amount: number;
  debit: number;
  mcc: number;
  category: number;
  account: number;
  currency: number;
  type: number;
  payee: number;
}

export interface CsvDraft {
  name: string;
  header: string[];
  rows: string[][];
  mapping: CsvMapping;
}

// A file's text as UTF-8, or as Windows-1251 that older bank exports use
export const decodeCsv = (buffer: ArrayBuffer): string => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1251").decode(buffer);
  }
};

// A statement read for mapping, or null when it has no rows under its header
export const csvDraft = (name: string, text: string): CsvDraft | null => {
  const [header, ...rows] = parseCsv(text);
  if (!header || rows.length === 0) return null;
  return { name, header, rows, mapping: guessMapping(header) };
};

// The rows of a CSV text, its delimiter guessed from the first line
export const parseCsv = (text: string): string[][] => {
  const clean = text.replace(/^\uFEFF/u, "").replaceAll(/\r\n?/gu, "\n");
  const firstLine = clean.slice(0, clean.indexOf("\n") >= 0 ? clean.indexOf("\n") : clean.length);
  const delimiter = [";", "\t", ","].toSorted((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
};

// The first column whose title fits one of the patterns, in their order
const find = (header: string[], patterns: RegExp[]) => {
  for (const re of patterns) {
    const i = header.findIndex((h) => re.test(h));
    if (i >= 0) return i;
  }
  return -1;
};

// Which columns hold what, in bank statements and other apps' exports alike
export const guessMapping = (header: string[]): CsvMapping => {
  const h = header.map((x) => x.trim().toLocaleLowerCase());
  // A bank's own currency column names the operation's currency, not the amount's
  const cardAmount = h.some((title) => /сума.*картк/u.test(title));
  return {
    date: find(h, [/дата/, /date/, /дата і час/]),
    description: find(h, [/деталі/, /опис/, /призначення/, /description/, /details/, /^note$/, /назва/, /коментар/]),
    amount: find(h, [/сума в валюті картки/, /сума.*картк/, /^сума/, /^amount$/, /amount/, /сума/, /sum/]),
    debit: find(h, [/^витрат/, /debit/, /списан/]),
    mcc: find(h, [/^mcc$/, /mcc/]),
    category: find(h, [/^категорі/, /^category$/, /^category name$/, /categor/]),
    account: find(h, [/^рахун/, /^account$/, /^wallet$/, /^account name$/]),
    currency: cardAmount ? -1 : find(h, [/^валюта$/, /^currency$/]),
    type: find(h, [/^тип$/, /^type$/]),
    payee: find(h, [/^payee$/, /^отримувач/, /^merchant$/]),
  };
};

// The currency a cell names: a code or a sign
const currencyOf = (raw: string): Currency | undefined => {
  const text = raw.trim().toUpperCase();
  if (text === "₴" || text === "ГРН" || text === "UAH") return "UAH";
  if (text === "$") return "USD";
  if (text === "€") return "EUR";
  return CURRENCIES.find((currency) => currency === text);
};

// What a type cell says an operation is, or nothing when it does not say
const kindOf = (raw: string): "expense" | "income" | "transfer" | undefined => {
  const text = raw.trim().toLocaleLowerCase();
  if (
    /transfer|переказ|převod|przelew|überweisung|transferencia|virement|trasferimento|overboeking|transferência/u.test(
      text,
    )
  ) {
    return "transfer";
  }
  if (/expens|витрат|výdaj|wydat|ausgabe|gasto|dépense|spes|uitgave|despesa/u.test(text)) return "expense";
  if (/income|дохід|доход|příjem|przych|einnahme|ingreso|revenu|entrat|inkomst|receita/u.test(text)) return "income";
  return undefined;
};

// A number written with spaces, commas or a minus sign, or NaN
export const parseNumber = (raw: string): number => {
  let s = raw
    .replaceAll(/[\s\u00A0\u202F]/gu, "")
    .replaceAll(/[\u2212\u2013]/gu, "-")
    .replaceAll(/[^\d.,-]/gu, "");
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replaceAll(".", "").replace(",", ".");
  else s = s.replaceAll(",", "");
  return Number(s);
};

// A day of a calendar as ISO, or null when the calendar has no such day
const calendarDay = (year: number, month: number, day: number): string | null => {
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return `${String(year)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

// A date in one of the formats banks export, month first when nothing else fits
export const parseDate = (raw: string): string | null => {
  const s = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/u.exec(s);
  if (iso) return calendarDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const [, first = "", second = "", year = ""] = /^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/u.exec(s) ?? [];
  if (!year || year.length === 3) return null;
  const fullYear = Number(year.length === 2 ? `20${year}` : year);
  return calendarDay(fullYear, Number(second), Number(first)) ?? calendarDay(fullYear, Number(first), Number(second));
};

// A cell of a role, or empty when the role has no column
const cell = (row: string[], index: number) => (index >= 0 ? (row[index] ?? "") : "");

// A statement's rows as entries to import, empty ones and transfers left out
export const candidatesFromCsv = (
  state: AppState,
  rows: string[][],
  mapping: CsvMapping,
  currency: Currency,
  nameOf: (category: Category) => string = (category) => category.name,
): ImportCandidate[] => {
  const out: ImportCandidate[] = [];
  const repeats = new Map<string, number>();
  for (const row of rows) {
    const date = parseDate(cell(row, mapping.date));
    if (!date) continue;
    let signed = parseNumber(cell(row, mapping.amount));
    if (mapping.debit >= 0) {
      const spent = parseNumber(cell(row, mapping.debit));
      if (Number.isFinite(spent) && spent !== 0) signed = -Math.abs(spent);
    }
    const kind = kindOf(cell(row, mapping.type));
    if (!Number.isFinite(signed) || signed === 0 || kind === "transfer") continue;
    if (kind === "expense") signed = -Math.abs(signed);
    if (kind === "income") signed = Math.abs(signed);
    const text = cell(row, mapping.description).trim() || cell(row, mapping.payee).trim();
    const description = text.replaceAll(/\s+/gu, " ").slice(0, 200);
    const mccRaw = mapping.mcc >= 0 ? Number(row[mapping.mcc]) : NaN;
    const mcc = Number.isInteger(mccRaw) && mccRaw > 0 ? mccRaw : undefined;
    const type = signed < 0 ? "expense" : "income";
    const named = cell(row, mapping.category).trim().toLocaleLowerCase();
    const category = named
      ? state.categories.find(
          (entry) =>
            entry.kind === type &&
            (entry.name.toLocaleLowerCase() === named || nameOf(entry).toLocaleLowerCase() === named),
        )
      : undefined;
    const accountName = cell(row, mapping.account).trim().toLocaleLowerCase();
    const account = accountName
      ? state.savings.find((item) => item.name.trim().toLocaleLowerCase() === accountName)
      : undefined;
    const base = `${date}|${signed}|${description}`;
    const nth = (repeats.get(base) ?? 0) + 1;
    repeats.set(base, nth);
    out.push({
      externalId: `csv:${fingerprint(nth === 1 ? base : `${base}|${String(nth)}`)}`,
      date,
      type,
      amount: Math.abs(signed),
      currency: currencyOf(cell(row, mapping.currency)) ?? account?.currency ?? currency,
      description,
      mcc,
      categoryId: category?.id ?? suggestCategory(state, description, type, mcc),
      duplicate: false,
      ...(account ? { accountId: account.id } : {}),
    });
  }
  return out;
};
