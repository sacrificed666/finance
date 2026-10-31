import { COINS } from "@/features/accounts/model/coins";
import { investmentAt } from "@/features/data/model/finmath";
import type {
  AppState,
  Compounding,
  CompoundingFreq,
  Investment,
  InvestmentKind,
  Settings,
} from "@/features/data/model/types";
import type { InzhurQuote } from "@/features/investments/api/inzhur";
import { addDays, addMonths, dateInMonth, daysBetween, monthOf, wholeMonthsBetween } from "@/shared/lib/date";
import { convert, parseAmount, type Currency } from "@/shared/lib/money";

import { INZHUR_FUNDS, inzhurFund } from "./inzhur";
import { valuationOf } from "./kinds";
import { returnPolicy, type ReturnPolicy } from "./returns";

export interface InvestmentForm {
  id: string | null;
  name: string;
  kind: InvestmentKind;
  currency: Currency;
  marketValue: string;
  coin: string;
  fund: string;
  quantity: string;
  nav: number | null;
  navAt: string | null;
  quote: InzhurQuote | null;
  principal: string;
  rate: string;
  startDate: string;
  endDate: string;
  compounding: Compounding;
  freq: CompoundingFreq;
  contribution: string;
  note: string;
}

// The coin a crypto position starts with
const FIRST_COIN = COINS[0]?.id ?? "";
// The fund an Inzhur position starts with
const FIRST_FUND = INZHUR_FUNDS[0]?.id ?? "";

// Whether a kind of position is held as a number of coins or certificates
export const isCounted = (kind: InvestmentKind): boolean => kind === "crypto" || kind === "inzhur";

// The form of a new position, or of a stored one
export const initialInvestmentForm = (target: Investment | "new", today: string): InvestmentForm => {
  if (target === "new") {
    return {
      id: null,
      name: "",
      kind: "deposit",
      currency: "UAH",
      marketValue: "",
      coin: FIRST_COIN,
      fund: FIRST_FUND,
      quantity: "",
      nav: null,
      navAt: null,
      quote: null,
      principal: "",
      rate: "",
      startDate: today,
      endDate: "",
      compounding: "reinvest",
      freq: "monthly",
      contribution: "",
      note: "",
    };
  }
  return {
    id: target.id,
    name: target.name,
    kind: target.kind,
    currency: target.currency,
    marketValue: String(target.marketValue ?? ""),
    coin: target.coin ?? FIRST_COIN,
    fund: target.fund ?? FIRST_FUND,
    quantity: String(target.quantity ?? ""),
    nav: null,
    navAt: null,
    quote: null,
    principal: String(target.principal),
    rate: String(target.annualRatePct),
    startDate: target.startDate,
    endDate: target.endDate ?? "",
    compounding: target.compounding,
    freq: target.compoundingFreq,
    contribution: String(target.monthlyContribution ?? ""),
    note: target.note ?? "",
  };
};

// The end of a new term as long as the last one, counted from its end
export const nextTerm = (start: string, end: string): string => {
  const months = wholeMonthsBetween(start, end);
  if (months > 0 && start.slice(8) === end.slice(8)) {
    return dateInMonth(addMonths(monthOf(end), months), Number(end.slice(8)));
  }
  return addDays(end, Math.max(1, daysBetween(start, end)));
};

// The form of a matured position put in again with what it came to
export const renewInvestmentForm = (inv: Investment & { endDate: string }, today: string): InvestmentForm => {
  const form = initialInvestmentForm(inv, today);
  const value = String(Math.round(investmentAt(inv, inv.endDate).value * 100) / 100);
  const market = valuationOf(inv.kind) === "market";
  return {
    ...form,
    principal: market ? form.principal : value,
    marketValue: market ? value : form.marketValue,
    startDate: inv.endDate,
    endDate: nextTerm(inv.startDate, inv.endDate),
    contribution: "",
  };
};

// The return policy the form's kind, fund and choices come to
export const formPolicy = (form: InvestmentForm): ReturnPolicy =>
  returnPolicy({
    kind: form.kind,
    fund: form.kind === "inzhur" ? form.fund : undefined,
    compounding: form.compounding,
    compoundingFreq: form.freq,
  });

// The form with its compounding settled by the policy of its kind
const withPolicy = (form: InvestmentForm): InvestmentForm => {
  const policy = formPolicy(form);
  return { ...form, compounding: policy.compounding, freq: policy.compoundingFreq };
};

// The form as another kind; an Inzhur position takes a fund's name and yield
export const switchInvestmentKind = (form: InvestmentForm, kind: InvestmentKind): InvestmentForm => {
  const fund = inzhurFund(form.fund) ?? INZHUR_FUNDS[0];
  const fundName = fund?.name ?? "";
  const toInzhur = kind === "inzhur" && form.kind !== "inzhur";
  const fromInzhur = kind !== "inzhur" && form.kind === "inzhur";
  let { compounding, name, rate } = form;
  if (kind === "deposit") compounding = "reinvest";
  if (kind === "reit") compounding = "payout";
  if (toInzhur) {
    if (!name.trim()) name = fundName;
    rate = fund ? String(fund.projectedYieldPct) : rate;
  }
  if (fromInzhur) {
    if (name === fundName) name = "";
    rate = "";
  }
  return withPolicy({ ...form, kind, compounding, currency: kind === "inzhur" ? "UAH" : form.currency, name, rate });
};

// The form on another fund, renamed when it carried the old fund's name
export const switchFund = (form: InvestmentForm, fundId: string): InvestmentForm => {
  const previous = inzhurFund(form.fund);
  const next = inzhurFund(fundId);
  const named = !form.name.trim() || form.name === previous?.name;
  return withPolicy({
    ...form,
    fund: fundId,
    nav: null,
    navAt: null,
    quote: null,
    compounding: next?.income === "dividends" ? "payout" : "reinvest",
    name: named && next ? next.name : form.name,
    rate: next ? String(next.projectedYieldPct) : form.rate,
  });
};

// The form with a fund's latest price, unless another fund was picked meanwhile
export const withQuote = (
  form: InvestmentForm,
  fundId: string,
  quote: InzhurQuote,
  fetchedAt: string,
): InvestmentForm =>
  form.kind === "inzhur" && form.fund === fundId
    ? { ...form, nav: quote.navPerCertificate, navAt: fetchedAt, quote, rate: String(quote.projectedYieldPct) }
    : form;

// What the certificates are worth at the fund's latest price, or null
export const navWorth = (form: InvestmentForm, settings: Settings): number | null => {
  if (form.kind !== "inzhur" || form.nav === null) return null;
  const quantity = parseAmount(form.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return quantity * convert(form.nav, "UAH", form.currency, settings.rates);
};

export type InvestmentProblem =
  | "balance.inv.problem.name"
  | "balance.inv.problem.principal"
  | "balance.inv.problem.start"
  | "balance.inv.problem.expected"
  | "balance.inv.problem.topUp"
  | "balance.inv.problem.certificates"
  | "balance.inv.problem.coins"
  | "balance.inv.problem.value"
  | "balance.inv.problem.rate"
  | "balance.inv.problem.maturity";

// Whether a yearly rate is one the app accepts
const isRate = (value: number) => Number.isFinite(value) && value >= 0 && value <= 200;

// Whether a field is empty or holds an amount of zero or more
const isOptionalAmount = (input: string) => {
  const value = parseAmount(input);
  return input.trim() === "" || (Number.isFinite(value) && value >= 0);
};

// What stops the position from being saved, the first problem only, or null
export const investmentProblem = (form: InvestmentForm): InvestmentProblem | null => {
  const market = valuationOf(form.kind) === "market";
  const principal = parseAmount(form.principal);
  if (!form.name.trim()) return "balance.inv.problem.name";
  if (!Number.isFinite(principal) || principal <= 0) return "balance.inv.problem.principal";
  if (!form.startDate) return "balance.inv.problem.start";
  if (market && form.rate.trim() !== "" && !isRate(parseAmount(form.rate))) return "balance.inv.problem.expected";
  if (!isOptionalAmount(form.contribution)) return "balance.inv.problem.topUp";
  if (isCounted(form.kind)) {
    const quantity = parseAmount(form.quantity);
    if (Number.isFinite(quantity) && quantity > 0) return null;
    return form.kind === "inzhur" ? "balance.inv.problem.certificates" : "balance.inv.problem.coins";
  }
  if (market) return isOptionalAmount(form.marketValue) ? null : "balance.inv.problem.value";
  if (!isRate(parseAmount(form.rate))) return "balance.inv.problem.rate";
  if (form.endDate && form.endDate < form.startDate) return "balance.inv.problem.maturity";
  return null;
};

// The market value to keep: the fund price, the last coin price or the typed one
const marketValueOf = (
  form: InvestmentForm,
  existing: Investment | undefined,
  worth: number | null,
  principal: number,
): number => {
  if (worth !== null) return worth;
  if (isCounted(form.kind)) {
    const same = existing?.kind === form.kind && existing.quantity === parseAmount(form.quantity);
    return (same ? existing.marketValue : undefined) ?? principal;
  }
  const stated = parseAmount(form.marketValue);
  return form.marketValue.trim() === "" || !Number.isFinite(stated) ? principal : stated;
};

// The stored fields of the position the form describes
export const investmentFields = (
  form: InvestmentForm,
  existing: Investment | undefined,
  settings: Settings,
  now: string,
): Omit<Investment, "id"> => {
  const market = valuationOf(form.kind) === "market";
  const crypto = form.kind === "crypto";
  const inzhur = form.kind === "inzhur";
  const counted = isCounted(form.kind);
  const principal = parseAmount(form.principal);
  const rate = parseAmount(form.rate);
  const topUp = form.contribution.trim() === "" ? 0 : parseAmount(form.contribution);
  const worth = navWorth(form, settings);
  const policy = formPolicy(form);
  let pricedAt = counted ? existing?.pricedAt : undefined;
  if (worth !== null) pricedAt = form.navAt ?? now;
  return {
    name: form.name.trim(),
    currency: form.currency,
    principal,
    annualRatePct: market && (form.rate.trim() === "" || !Number.isFinite(rate)) ? 0 : rate,
    startDate: form.startDate,
    compounding: policy.compounding,
    compoundingFreq: policy.compoundingFreq,
    note: form.note.trim() || undefined,
    kind: form.kind,
    marketValue: market ? marketValueOf(form, existing, worth, principal) : undefined,
    coin: crypto ? form.coin : undefined,
    fund: inzhur ? form.fund : undefined,
    quantity: counted ? parseAmount(form.quantity) : undefined,
    pricedAt,
    coinIcon: crypto ? existing?.coinIcon : undefined,
    endDate: form.endDate || undefined,
    monthlyContribution: topUp > 0 ? topUp : undefined,
  };
};

// The positions with the form's position changed in place or added
export const saveInvestment = (state: AppState, form: InvestmentForm, makeId: () => string, now: string): AppState => {
  const id = form.id;
  const existing = id ? state.investments.find((inv) => inv.id === id) : undefined;
  const fields = investmentFields(form, existing, state.settings, now);
  return {
    ...state,
    investments: id
      ? state.investments.map((inv) => (inv.id === id ? { ...inv, ...fields } : inv))
      : [...state.investments, { id: makeId(), ...fields }],
  };
};

// The positions without one, for deleting it or taking the money out
export const removeInvestment = (state: AppState, id: string): AppState => ({
  ...state,
  investments: state.investments.filter((inv) => inv.id !== id),
});
