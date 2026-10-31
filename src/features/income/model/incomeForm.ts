import { activeAccounts } from "@/features/accounts/model/accounts";
import { breakdownTotal } from "@/features/data/model/finmath";
import type {
  AppState,
  IncomeBreakdown,
  IncomeTax,
  Settings,
  TaxProfile,
  TaxRegimeId,
  Transaction,
} from "@/features/data/model/types";
import { parseAmount, type Currency } from "@/shared/lib/money";

import { hasEsv, profileFromRegime, regimeRates, taxBreakdown, taxRegime } from "./tax";

export type IncomeMode = "amount" | "contract";

export interface IncomeForm {
  id: string | null;
  mode: IncomeMode;
  categoryId: string;
  currency: Currency;
  date: string;
  note: string;
  accountId: string;
  taxRegime: TaxRegimeId;
  taxRate: string;
  taxFixed: string;
  taxVat: string;
  taxLabel: string;
  taxEsv: boolean;
  amount: string;
  days: string;
  dailyRate: string;
  premium: string;
  compensations: string;
  cutoffs: string;
}

// A number typed in a field, or zero for an empty field
export const parseOptional = (input: string): number => (input.trim() === "" ? 0 : parseAmount(input));

// Whether a stored tax has a regime's figures, with or without the ЄСВ
const matches = (tax: IncomeTax, regime: TaxRegimeId, esv: boolean) => {
  const rates = regimeRates(regime, esv);
  return (
    Math.abs(rates.ratePct - tax.ratePct) < 1e-9 &&
    Math.abs(rates.fixedUAH - tax.fixedUAH) < 1e-6 &&
    Math.abs(rates.vatPct - (tax.vatPct ?? 0)) < 1e-9
  );
};

// The regime of a stored tax and whether it had the social contribution
export const storedTaxChoice = (tax: IncomeTax): { regime: TaxRegimeId; esv: boolean } => {
  const { regime } = tax;
  if (!regime || regime === "custom") return { regime: "custom", esv: true };
  if (matches(tax, regime, true)) return { regime, esv: true };
  if (hasEsv(regime) && matches(tax, regime, false)) return { regime, esv: false };
  return { regime: "custom", esv: true };
};

// The regime of a stored tax, or custom when its figures no longer match one
export const regimeOfStoredTax = (tax: IncomeTax): TaxRegimeId => storedTaxChoice(tax).regime;

// A new income in the account's currency and tax settings, dated today
export const blankIncomeForm = (state: AppState, today: string): IncomeForm => {
  const { settings } = state;
  return {
    id: null,
    mode: "amount",
    categoryId: state.categories.find((entry) => entry.kind === "income")?.id ?? "",
    currency: settings.baseCurrency,
    date: today,
    note: "",
    accountId: activeAccounts(state.savings)[0]?.id ?? "",
    taxRegime: settings.tax.regime,
    taxRate: String(settings.tax.ratePct),
    taxFixed: String(settings.tax.fixedUAH),
    taxVat: String(settings.tax.vatPct),
    taxLabel: settings.tax.label,
    taxEsv: settings.tax.esv,
    amount: "",
    days: "",
    dailyRate: "",
    premium: "",
    compensations: "",
    cutoffs: "",
  };
};

// The form of a stored income: its contract or its gross amount and its tax
export const incomeFormFor = (state: AppState, tx: Transaction, today: string): IncomeForm => {
  const { settings } = state;
  const contract = tx.breakdown;
  return {
    ...blankIncomeForm(state, today),
    id: tx.id,
    mode: contract ? "contract" : "amount",
    categoryId: tx.categoryId,
    currency: tx.currency,
    date: tx.date,
    note: tx.note ?? "",
    accountId: tx.accountId ?? "",
    taxRegime: tx.tax ? regimeOfStoredTax(tx.tax) : "none",
    taxEsv: tx.tax ? storedTaxChoice(tx.tax).esv : settings.tax.esv,
    taxRate: String(tx.tax ? tx.tax.ratePct : settings.tax.ratePct),
    taxFixed: String(tx.tax ? tx.tax.fixedUAH : settings.tax.fixedUAH),
    taxVat: String(tx.tax ? (tx.tax.vatPct ?? 0) : settings.tax.vatPct),
    taxLabel: tx.tax?.label ?? "",
    amount: contract ? "" : String(tx.tax ? tx.tax.gross : tx.amount),
    days: contract ? String(contract.days) : "",
    dailyRate: contract ? String(contract.dailyRate) : "",
    premium: contract?.premium ? String(contract.premium) : "",
    compensations: contract?.compensations ? String(contract.compensations) : "",
    cutoffs: contract?.cutoffs ? String(contract.cutoffs) : "",
  };
};

// The tax settings the form applies, or null without a tax
export const profileOf = (form: IncomeForm): TaxProfile | null => {
  if (form.taxRegime === "none") return null;
  if (!taxRegime(form.taxRegime).editable) return profileFromRegime(form.taxRegime, { esv: form.taxEsv });
  return {
    regime: "custom",
    ratePct: parseOptional(form.taxRate),
    fixedUAH: parseOptional(form.taxFixed),
    vatPct: parseOptional(form.taxVat),
    label: form.taxLabel.trim(),
    esv: form.taxEsv,
  };
};

// The contract of the form, or nothing for a plain amount
export const contractOf = (form: IncomeForm): IncomeBreakdown | undefined =>
  form.mode === "contract"
    ? {
        days: parseOptional(form.days),
        dailyRate: parseOptional(form.dailyRate),
        premium: parseOptional(form.premium),
        compensations: parseOptional(form.compensations),
        cutoffs: parseOptional(form.cutoffs),
      }
    : undefined;

// The gross income the form stands for, not a number when a field is not one
export const incomeGross = (form: IncomeForm): number => {
  const contract = contractOf(form);
  return contract ? breakdownTotal(contract) : parseAmount(form.amount);
};

// The income's gross, taxes and net under the form's tax
export const incomeFigures = (form: IncomeForm, settings: Settings) => {
  const gross = incomeGross(form);
  const profile = profileOf(form);
  const breakdown = profile && Number.isFinite(gross) ? taxBreakdown(gross, form.currency, profile, settings) : null;
  return { gross, profile, breakdown, net: breakdown ? breakdown.net : gross };
};

export type IncomeProblem =
  | "income.problem.category"
  | "income.problem.date"
  | "income.problem.days"
  | "income.problem.nonNegative"
  | "income.problem.taxRate"
  | "income.problem.taxFixed"
  | "income.problem.taxVat"
  | "income.problem.amount"
  | "income.problem.afterTax";

// Whether a percentage is a share below a hundred
const isShare = (value: number) => Number.isFinite(value) && value >= 0 && value < 100;

// What stops the income from being saved, the first problem only, or null
export const incomeProblem = (form: IncomeForm, settings: Settings): IncomeProblem | null => {
  if (!form.categoryId) return "income.problem.category";
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(form.date)) return "income.problem.date";
  if (form.mode === "contract") {
    const days = parseOptional(form.days);
    if (!Number.isFinite(days) || days < 0 || days > 31) return "income.problem.days";
    const amounts = [form.dailyRate, form.premium, form.compensations, form.cutoffs].map(parseOptional);
    if (amounts.some((value) => !Number.isFinite(value) || value < 0)) return "income.problem.nonNegative";
  }
  const { gross, profile, net } = incomeFigures(form, settings);
  if (profile) {
    if (!isShare(profile.ratePct)) return "income.problem.taxRate";
    if (!Number.isFinite(profile.fixedUAH) || profile.fixedUAH < 0) return "income.problem.taxFixed";
    if (!isShare(profile.vatPct)) return "income.problem.taxVat";
  }
  if (!Number.isFinite(gross) || gross <= 0) return "income.problem.amount";
  if (!Number.isFinite(net) || net <= 0) return "income.problem.afterTax";
  return null;
};

// The state with the income saved; a new one also keeps its tax as the default
export const saveIncome = (state: AppState, form: IncomeForm, makeId: () => string): AppState => {
  const { gross, profile, net } = incomeFigures(form, state.settings);
  const tax: IncomeTax | undefined = profile
    ? {
        ratePct: profile.ratePct,
        fixedUAH: profile.fixedUAH,
        gross,
        regime: profile.regime,
        vatPct: profile.vatPct || undefined,
        label: profile.label || undefined,
      }
    : undefined;
  const fields = {
    type: "income" as const,
    amount: net,
    currency: form.currency,
    categoryId: form.categoryId,
    date: form.date,
    note: form.note.trim() || undefined,
    accountId: form.accountId || undefined,
    breakdown: contractOf(form),
    tax,
  };
  return {
    ...state,
    settings: form.id || !profile ? state.settings : { ...state.settings, tax: profile },
    transactions: form.id
      ? state.transactions.map((tx) => (tx.id === form.id ? { ...tx, ...fields } : tx))
      : [...state.transactions, { id: makeId(), ...fields }],
  };
};
