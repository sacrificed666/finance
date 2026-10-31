import { categoryName } from "@/features/data/model/categoryName";
import type { AppState, Transaction } from "@/features/data/model/types";
import type { I18n } from "@/shared/i18n/translate";
import { convert, ratesAt, type Currency } from "@/shared/lib/money";

export interface CsvStyle {
  separator: string;
  decimal: string;
}

export interface ReportCsvRow {
  label: string;
  current: number;
  previous: number;
}

// The separator and decimal mark a spreadsheet in the language expects
export const csvStyle = (intl: string): CsvStyle => {
  const decimal = new Intl.NumberFormat(intl).formatToParts(1.5).find((part) => part.type === "decimal")?.value ?? ".";
  return decimal === "," ? { separator: ";", decimal: "," } : { separator: ",", decimal: "." };
};

// The helpers that write cells, numbers and a whole file in a style
const writer = (style: CsvStyle) => ({
  // A text cell, quoted when it holds the separator, a quote or a line break
  cell: (value: string) =>
    value.includes(style.separator) || /["\r\n]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value,
  // A number to the cent with the style's decimal mark
  num: (value: number) => (Math.round(value * 100) / 100).toFixed(2).replace(".", style.decimal),
  // The lines as a file with a byte order mark, so spreadsheets read it as UTF-8
  file: (lines: string[][]) => `﻿${lines.map((cells) => cells.join(style.separator)).join("\r\n")}\r\n`,
});

// The sign of an entry's amount in the journal: spending is negative
const signOf = (tx: Transaction) => (tx.type === "expense" ? -1 : 1);

// Entries in date order, the same day by id
const byDate = (a: Transaction, b: Transaction) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id);

// The entries as a spreadsheet journal, one line each in date order
export const journalCsv = (state: AppState, transactions: Transaction[], i18n: I18n, today: string): string => {
  const { t } = i18n;
  const { cell, num, file } = writer(csvStyle(i18n.intl));
  const base = state.settings.baseCurrency;
  const categories = new Map(state.categories.map((entry) => [entry.id, entry]));
  const accounts = new Map(state.savings.map((account) => [account.id, account.name]));
  // A category under its parent, as "Food › Groceries"
  const categoryPath = (id: string) => {
    const entry = categories.get(id);
    const parent = entry?.parentId ? categories.get(entry.parentId) : undefined;
    return parent ? `${categoryName(i18n, parent)} › ${categoryName(i18n, entry)}` : categoryName(i18n, entry);
  };
  const head = [
    t("common.date"),
    t("export.col.type"),
    t("common.amount"),
    t("common.currency"),
    t("export.col.inBase", { currency: base }),
    t("common.category"),
    t("common.account"),
    t("export.col.toAccount"),
    t("common.note"),
    t("export.col.tags"),
    t("export.col.planned"),
  ];
  const rows = transactions
    .toSorted(byDate)
    .map((tx) => [
      tx.date,
      t(`tx.type.${tx.type}`),
      num(signOf(tx) * tx.amount),
      tx.currency,
      num(signOf(tx) * convert(tx.amount, tx.currency, base, ratesAt(state.settings, tx.date))),
      cell(tx.type === "transfer" ? "" : categoryPath(tx.categoryId)),
      cell(tx.accountId ? (accounts.get(tx.accountId) ?? "") : ""),
      cell(tx.toAccountId ? (accounts.get(tx.toAccountId) ?? "") : ""),
      cell(tx.note ?? ""),
      cell((tx.tags ?? []).join(", ")),
      tx.date > today ? t("export.yes") : "",
    ]);
  return file([head.map(cell), ...rows]);
};

// A report as a spreadsheet: categories in both periods, then the totals
export const reportCsv = (
  rows: ReportCsvRow[],
  totals: { income: ReportCsvRow; expense: ReportCsvRow; net: ReportCsvRow },
  periods: { current: string; previous: string },
  currency: Currency,
  i18n: I18n,
): string => {
  const { t } = i18n;
  const { cell, num, file } = writer(csvStyle(i18n.intl));
  // A row's label, both figures and the change between them
  const line = (row: ReportCsvRow) => [
    cell(row.label),
    num(row.current),
    num(row.previous),
    num(row.current - row.previous),
  ];
  const head = [
    t("common.category"),
    `${periods.current}, ${currency}`,
    `${periods.previous}, ${currency}`,
    t("export.col.change"),
  ];
  return file([head.map(cell), ...rows.map(line), [], line(totals.income), line(totals.expense), line(totals.net)]);
};
