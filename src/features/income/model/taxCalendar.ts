import type { AppState, IncomeTax, TaxRegimeId, Transaction } from "@/features/data/model/types";
import { addDays, pad } from "@/shared/lib/date";
import { convert, ratesAt } from "@/shared/lib/money";

import { esvMinimum, taxRegime } from "./tax";

export type ObligationKind = "declaration" | "single" | "levy" | "esv" | "vatDeclaration" | "vat";

export interface TaxObligation {
  id: string;
  kind: ObligationKind;
  period: string;
  due: string;
  amount?: number;
  base?: number;
}

// The regimes whose payments and filings the app plans
const CALENDAR_REGIMES = new Set<TaxRegimeId>(["fop1", "fop2", "fop3", "fop3vat"]);

// Whether the app keeps a tax calendar for a regime
export const hasTaxCalendar = (regime: TaxRegimeId): boolean => CALENDAR_REGIMES.has(regime);

// A date moved off a weekend to the Monday after it
const workday = (date: string): string => {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (day === 6) return addDays(date, 2);
  if (day === 0) return addDays(date, 1);
  return date;
};

// The last day of a quarter
const quarterEnd = (year: number, quarter: number) => {
  const month = quarter * 3;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${String(year)}-${pad(month)}-${pad(last)}`;
};

// The share of a gross income that is VAT
const vatOf = (gross: number, vatPct: number) => (vatPct > 0 ? gross - gross / (1 + vatPct / 100) : 0);

// The taxed income of some days in hryvnias, its VAT and its entries
export const taxedIncome = (state: AppState, from: string, to: string) => {
  const { settings } = state;
  let gross = 0;
  let vat = 0;
  const entries: Transaction[] = [];
  for (const tx of state.transactions) {
    if (tx.type !== "income" || !tx.tax || tx.date < from || tx.date > to) continue;
    const uah = convert(tx.tax.gross, tx.currency, "UAH", ratesAt(settings, tx.date));
    gross += uah;
    vat += vatOf(uah, tx.tax.vatPct ?? 0);
    entries.push(tx);
  }
  return { gross, vat, entries };
};

// A part of a regime's tax, such as the single tax or the levy
const ratePart = (regime: TaxRegimeId, id: string, year: number) =>
  taxRegime(regime, year).components.find((component) => component.id === id);

// The quarterly payments and filings of the third group
const quarterlyObligations = (state: AppState, regime: TaxRegimeId, year: number, quarter: number) => {
  const period = `${String(year)}-Q${String(quarter)}`;
  const end = quarterEnd(year, quarter);
  const nextMonth = quarter === 4 ? `${String(year + 1)}-01` : `${String(year)}-${pad(quarter * 3 + 1)}`;
  const obligations: TaxObligation[] = state.settings.tax.esv
    ? [{ id: `${period}:esv`, kind: "esv", period, due: workday(`${nextMonth}-20`), amount: 3 * esvMinimum(year) }]
    : [];
  if (regime !== "fop3" && regime !== "fop3vat") return obligations;
  const income = taxedIncome(state, `${String(year)}-${pad(quarter * 3 - 2)}-01`, end);
  const base = income.gross - income.vat;
  const single = ratePart(regime, "single", year)?.ratePct ?? 0;
  const levy = ratePart(regime, "levy", year)?.ratePct ?? 0;
  const paymentDue = workday(addDays(end, 50));
  return [
    ...obligations,
    { id: `${period}:declaration`, kind: "declaration", period, due: workday(addDays(end, 40)) },
    { id: `${period}:single`, kind: "single", period, due: paymentDue, amount: (base * single) / 100, base },
    { id: `${period}:levy`, kind: "levy", period, due: paymentDue, amount: (base * levy) / 100, base },
  ] satisfies TaxObligation[];
};

// The monthly payments of the first two groups and the VAT of the third
const monthlyObligations = (state: AppState, regime: TaxRegimeId, year: number, month: number): TaxObligation[] => {
  const period = `${String(year)}-${pad(month)}`;
  const obligations: TaxObligation[] = [];
  if (regime === "fop1" || regime === "fop2") {
    const due = workday(`${period}-20`);
    obligations.push(
      { id: `${period}:single`, kind: "single", period, due, amount: ratePart(regime, "single", year)?.fixedUAH },
      { id: `${period}:levy`, kind: "levy", period, due, amount: ratePart(regime, "levy", year)?.fixedUAH },
    );
  }
  if (regime === "fop3vat") {
    const nextMonth = month === 12 ? `${String(year + 1)}-01` : `${String(year)}-${pad(month + 1)}`;
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const income = taxedIncome(state, `${period}-01`, `${period}-${pad(last)}`);
    obligations.push(
      { id: `${period}:vatDeclaration`, kind: "vatDeclaration", period, due: workday(`${nextMonth}-20`) },
      {
        id: `${period}:vat`,
        kind: "vat",
        period,
        due: workday(addDays(`${nextMonth}-20`, 10)),
        amount: income.vat,
        base: income.gross,
      },
    );
  }
  return obligations;
};

// Every tax payment and filing of a year, by due date
export const taxObligations = (state: AppState, year: number): TaxObligation[] => {
  const regime = state.settings.tax.regime;
  if (!hasTaxCalendar(regime)) return [];
  const obligations = [
    ...[1, 2, 3, 4].flatMap((quarter) => quarterlyObligations(state, regime, year, quarter)),
    ...Array.from({ length: 12 }, (_, index) => monthlyObligations(state, regime, year, index + 1)).flat(),
  ];
  if (regime === "fop1" || regime === "fop2") {
    obligations.push({
      id: `${String(year)}:declaration`,
      kind: "declaration",
      period: String(year),
      due: workday(addDays(`${String(year)}-12-31`, 60)),
    });
  }
  return obligations.toSorted((a, b) => a.due.localeCompare(b.due) || a.kind.localeCompare(b.kind));
};

// The next unpaid obligations, from those overdue by up to 45 days on
export const upcomingObligations = (state: AppState, today: string, limit = 5): TaxObligation[] => {
  const year = Number(today.slice(0, 4));
  const paid = state.settings.taxPaid ?? {};
  return [...taxObligations(state, year - 1), ...taxObligations(state, year)]
    .filter((item) => !paid[item.id] && (item.amount === undefined || item.amount > 0.5 || item.kind === "esv"))
    .filter((item) => item.due >= addDays(today, -45))
    .slice(0, limit);
};

// The id of the expense that books a paid obligation
export const taxPaymentId = (obligationId: string) => `tax:${obligationId}`;

// The category tax payments are booked in
export const taxCategoryId = (state: AppState): string => {
  const byId = state.categories.find((entry) => entry.id === "cat-taxes");
  if (byId) return byId.id;
  const byName = state.categories.find((entry) => entry.kind === "expense" && /tax|податк/iu.test(entry.name));
  return byName?.id ?? state.categories.find((entry) => entry.id === "cat-other-exp")?.id ?? "";
};

// Whether income of the obligation's year already had its tax taken off
export const taxDeducted = (state: AppState, obligation: TaxObligation): boolean => {
  const year = obligation.period.slice(0, 4);
  return state.transactions.some((tx) => tx.type === "income" && tx.tax && tx.date.startsWith(year));
};

// Marks obligations paid on a day, booking expenses if asked, or unpaid again
export const recordTaxPayments = (
  state: AppState,
  obligations: readonly TaxObligation[],
  paid: boolean,
  day: string,
  labelOf: (obligation: TaxObligation) => string,
  book = true,
): AppState => {
  const taxPaid = { ...state.settings.taxPaid };
  const ids = new Set(obligations.map((item) => taxPaymentId(item.id)));
  const kept = state.transactions.filter((tx) => !ids.has(tx.id) || tx.externalId);
  for (const item of obligations) {
    if (paid) taxPaid[item.id] = day;
    else delete taxPaid[item.id];
  }
  const booked = new Set(kept.map((tx) => tx.id));
  const categoryId = taxCategoryId(state);
  const added: Transaction[] =
    paid && book
      ? obligations.flatMap((item) =>
          item.amount !== undefined && item.amount > 0.5 && !booked.has(taxPaymentId(item.id))
            ? [
                {
                  id: taxPaymentId(item.id),
                  type: "expense" as const,
                  amount: Math.round(item.amount * 100) / 100,
                  currency: "UAH" as const,
                  categoryId,
                  date: day,
                  note: labelOf(item),
                },
              ]
            : [],
        )
      : [];
  return { ...state, transactions: [...kept, ...added], settings: { ...state.settings, taxPaid } };
};

export type RateOf = (currency: Transaction["currency"], date: string) => number;

export interface IncomeBookRow {
  date: string;
  description: string;
  amount: number;
  currency: Transaction["currency"];
  rate: number;
  uah: number;
}

// A year's taxed income at its NBU rates, as the income book lists it
export const incomeBook = (state: AppState, year: number, rateOf: RateOf): IncomeBookRow[] =>
  state.transactions
    .flatMap((tx) => (tx.type === "income" && tx.tax && tx.date.startsWith(String(year)) ? [{ tx, tax: tx.tax }] : []))
    .toSorted((a, b) => a.tx.date.localeCompare(b.tx.date))
    .map(({ tx, tax }: { tx: Transaction; tax: IncomeTax }) => {
      const vatPct = tax.vatPct ?? 0;
      const amount = vatPct > 0 ? tax.gross / (1 + vatPct / 100) : tax.gross;
      const rate = tx.currency === "UAH" ? 1 : rateOf(tx.currency, tx.date);
      return { date: tx.date, description: tx.note ?? "", amount, currency: tx.currency, rate, uah: amount * rate };
    });

// A CSV cell, quoted when it holds a quote, a semicolon or a line break
const csvCell = (value: string) => (/[";\n]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value);
// A number with a decimal comma, as Ukrainian spreadsheets read it
const csvNumber = (value: number, digits = 2) => value.toFixed(digits).replace(".", ",");

// The income book in the official Ukrainian layout, ready for a spreadsheet
export const incomeBookCsv = (rows: readonly IncomeBookRow[]): string => {
  const head = ["Дата", "Сума доходу, грн", "Опис", "Сума у валюті", "Валюта", "Курс НБУ"];
  const lines = rows.map((row) =>
    [
      `${row.date.slice(8)}.${row.date.slice(5, 7)}.${row.date.slice(0, 4)}`,
      csvNumber(row.uah),
      csvCell(row.description),
      csvNumber(row.amount),
      row.currency,
      csvNumber(row.rate, 4),
    ].join(";"),
  );
  const total = rows.reduce((sum, row) => sum + row.uah, 0);
  return `﻿${[head.join(";"), ...lines, ["Разом", csvNumber(total), "", "", "", ""].join(";")].join("\r\n")}\r\n`;
};

export interface DeclarationFigures {
  quarter: number;
  incomeToDate: number;
  singleToDate: number;
  levyToDate: number;
  singleThisQuarter: number;
  levyThisQuarter: number;
}

// The figures of the third group's declaration for the year up to a quarter
export const declarationFigures = (
  state: AppState,
  year: number,
  quarter: number,
  rateOf: RateOf,
): DeclarationFigures | null => {
  const regime = state.settings.tax.regime;
  if (regime !== "fop3" && regime !== "fop3vat") return null;
  const single = ratePart(regime, "single", year)?.ratePct ?? 0;
  const levy = ratePart(regime, "levy", year)?.ratePct ?? 0;
  const book = incomeBook(state, year, rateOf);
  // The income of the year up to the end of a quarter
  const upTo = (last: number) =>
    book.filter((row) => Number(row.date.slice(5, 7)) <= last * 3).reduce((sum, row) => sum + row.uah, 0);
  const income = upTo(quarter);
  const before = quarter > 1 ? upTo(quarter - 1) : 0;
  return {
    quarter,
    incomeToDate: income,
    singleToDate: (income * single) / 100,
    levyToDate: (income * levy) / 100,
    singleThisQuarter: ((income - before) * single) / 100,
    levyThisQuarter: ((income - before) * levy) / 100,
  };
};

export interface QuarterRow {
  period: string;
  quarter: number;
  gross: number;
  single: number;
  levy: number;
  esv: number;
  vat: number;
  settled: boolean;
  payments: TaxObligation[];
}

// Each quarter's income in hryvnias, its taxes and whether all are paid
export const quarterRows = (state: AppState, year: number, rateOf: RateOf): QuarterRow[] => {
  const obligations = taxObligations(state, year);
  const paid = state.settings.taxPaid ?? {};
  const taxed = state.transactions.flatMap((tx) =>
    tx.type === "income" && tx.tax && tx.date.startsWith(String(year)) ? [{ tx, gross: tx.tax.gross }] : [],
  );
  return [1, 2, 3, 4].map((quarter) => {
    const period = `${String(year)}-Q${String(quarter)}`;
    const months = new Set(
      [quarter * 3 - 2, quarter * 3 - 1, quarter * 3].map((month) => `${String(year)}-${pad(month)}`),
    );
    const own = obligations.filter((item) => item.period === period || months.has(item.period));
    // The total of the quarter's obligations of a kind
    const sum = (kind: ObligationKind) =>
      own.filter((item) => item.kind === kind).reduce((total, item) => total + (item.amount ?? 0), 0);
    const payments = own.filter((item) => item.amount !== undefined);
    return {
      period,
      quarter,
      gross: taxed
        .filter(({ tx }) => months.has(tx.date.slice(0, 7)))
        .reduce(
          (total, { tx, gross }) => total + gross * (tx.currency === "UAH" ? 1 : rateOf(tx.currency, tx.date)),
          0,
        ),
      single: sum("single"),
      levy: sum("levy"),
      esv: sum("esv"),
      vat: sum("vat"),
      settled: payments.length > 0 && payments.every((item) => paid[item.id]),
      payments,
    };
  });
};
