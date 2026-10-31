import { investmentAt, projectedSnapshot, type InvestmentSnapshot } from "@/features/data/model/finmath";
import type { AppState, Investment, InvestmentKind, Settings } from "@/features/data/model/types";
import { addMonths, dateInMonth, monthOf } from "@/shared/lib/date";
import { convert, CURRENCIES, type Currency } from "@/shared/lib/money";

import { valuationOf } from "./kinds";

// The same day a year on, or that month's last day when it is shorter
export const oneYearFrom = (today: string): string =>
  dateInMonth(addMonths(monthOf(today), 12), Number(today.slice(8, 10)));

export interface PositionReturns {
  snap: InvestmentSnapshot;
  earned: number;
  gainPct: number;
  valueInYear: number;
  nextYear: number;
  nextYearPct: number;
  averageCapital: number;
}

// What a position has earned so far and should earn over the next year
export const positionReturns = (inv: Investment, today: string, yearOut: string): PositionReturns => {
  const snap = investmentAt(inv, today);
  const ahead = investmentAt(inv, yearOut);
  const projected = projectedSnapshot(inv, today, yearOut);
  const market = valuationOf(inv.kind) === "market";
  const topUp = inv.monthlyContribution ?? 0;
  const earned = snap.accrued + snap.paidOut;
  const nextYear = market
    ? projected.value - snap.value - topUp * 12 + projected.paidOut
    : ahead.accrued + ahead.paidOut - earned;
  const averageCapital = snap.value + topUp * 6;
  return {
    snap,
    earned,
    gainPct: snap.invested > 0 ? (earned / snap.invested) * 100 : 0,
    valueInYear: market ? projected.value : ahead.value,
    nextYear,
    nextYearPct: averageCapital > 0 ? (nextYear / averageCapital) * 100 : 0,
    averageCapital,
  };
};

export interface KindTotal {
  kind: InvestmentKind;
  invested: number;
  value: number;
  earned: number;
}

// The positions of each kind summed in the base currency, the largest first
export const investmentsByKind = (
  investments: readonly Investment[],
  today: string,
  settings: Settings,
): KindTotal[] => {
  const totals = new Map<InvestmentKind, KindTotal>();
  for (const inv of investments) {
    const snap = investmentAt(inv, today);
    // An amount of the position in the base currency
    const toBase = (amount: number) => convert(amount, inv.currency, settings.baseCurrency, settings.rates);
    const row = totals.get(inv.kind) ?? { kind: inv.kind, invested: 0, value: 0, earned: 0 };
    totals.set(inv.kind, {
      kind: inv.kind,
      invested: row.invested + toBase(snap.invested),
      value: row.value + toBase(snap.value),
      earned: row.earned + toBase(snap.accrued + snap.paidOut),
    });
  }
  return [...totals.values()].toSorted((a, b) => b.value - a.value);
};

// The value of the positions held in each currency, in the base currency
export const valueByCurrency = (state: AppState, today: string): { currency: Currency; value: number }[] => {
  const { baseCurrency, rates } = state.settings;
  return CURRENCIES.map((currency) => ({
    currency,
    value: state.investments
      .filter((inv) => inv.currency === currency)
      .reduce((sum, inv) => sum + convert(investmentAt(inv, today).value, currency, baseCurrency, rates), 0),
  })).filter((entry) => entry.value > 0);
};

export interface InvestmentTotals {
  invested: number;
  value: number;
  earned: number;
  paidOut: number;
  nextYear: number;
  capital: number;
  topUps: number;
  ahead: number[];
}

const NO_TOTALS = { invested: 0, value: 0, earned: 0, paidOut: 0, nextYear: 0, capital: 0 };

// All positions in the base currency: today, a year on and month by month
export const investmentTotals = (state: AppState, today: string): InvestmentTotals => {
  const { baseCurrency, rates } = state.settings;
  const yearOut = oneYearFrom(today);
  const month = monthOf(today);
  const day = Number(today.slice(8, 10));
  const totals = state.investments.reduce((sum, inv) => {
    const returns = positionReturns(inv, today, yearOut);
    // An amount of the position in the base currency
    const toBase = (amount: number) => convert(amount, inv.currency, baseCurrency, rates);
    return {
      invested: sum.invested + toBase(returns.snap.invested),
      value: sum.value + toBase(returns.snap.value),
      earned: sum.earned + toBase(returns.earned),
      paidOut: sum.paidOut + toBase(returns.snap.paidOut),
      nextYear: sum.nextYear + toBase(returns.nextYear),
      capital: sum.capital + toBase(returns.averageCapital),
    };
  }, NO_TOTALS);
  const ahead = Array.from({ length: 13 }, (_, index) => {
    const at = index === 0 ? today : dateInMonth(addMonths(month, index), day);
    return state.investments.reduce((sum, inv) => {
      const projected = projectedSnapshot(inv, today, at);
      return sum + convert(projected.value + projected.paidOut, inv.currency, baseCurrency, rates);
    }, 0);
  });
  const topUps = state.investments
    .filter((inv) => !inv.endDate || inv.endDate > today)
    .reduce((sum, inv) => sum + convert(inv.monthlyContribution ?? 0, inv.currency, baseCurrency, rates), 0);
  return { ...totals, topUps, ahead };
};
