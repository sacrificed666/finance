import {
  averageKept,
  buildProjection,
  holdings,
  monthlySeries,
  type ProjectionPoint,
} from "@/features/data/model/finmath";
import type { AppState, PlannedEvent } from "@/features/data/model/types";
import { scheduleShift } from "@/features/forecast/model/scheduleShift";
import { addMonths, monthOf } from "@/shared/lib/date";
import { convert, CURRENCIES, type Currency } from "@/shared/lib/money";

// The yearly inflation each currency is expected to lose
export const INFLATION_PCT: Record<Currency, number> = { UAH: 10, USD: 3, EUR: 2.5 };

// The share of savings that can be spent each year without running out
export const SAFE_WITHDRAWAL_PCT = 4;

export interface ForecastControls {
  years: number;
  returnPct: number;
  spreadPct: number;
  inflationOn: boolean;
  withDebts: boolean;
  withSaving: boolean;
}

export interface ForecastInputs extends ForecastControls {
  view: Currency;
  events: PlannedEvent[];
}

export interface InflationMix {
  pct: number;
  shares: { currency: Currency; share: number }[] | null;
}

// A point with nothing in it, for a projection that has no points
const NO_POINT: ProjectionPoint = { month: "", savings: 0, investments: 0, debt: 0, total: 0, net: 0 };

// The inflation of the money's currencies, weighted by what is held in each
export const inflationMix = (state: AppState, today: string): InflationMix => {
  const weight = new Map<Currency, number>();
  for (const holding of holdings(state, today)) {
    weight.set(holding.currency, (weight.get(holding.currency) ?? 0) + Math.max(0, holding.base));
  }
  // The money held in a currency
  const weightOf = (currency: Currency) => weight.get(currency) ?? 0;
  const total = CURRENCIES.reduce((sum, currency) => sum + weightOf(currency), 0);
  if (total <= 0) return { pct: INFLATION_PCT[state.settings.baseCurrency], shares: null };
  return {
    pct: CURRENCIES.reduce((sum, currency) => sum + (weightOf(currency) / total) * INFLATION_PCT[currency], 0),
    shares: CURRENCIES.filter((currency) => weightOf(currency) > 0).map((currency) => ({
      currency,
      share: weightOf(currency) / total,
    })),
  };
};

export interface KeptMoney {
  average: number;
  topUps: number;
  toAccounts: number;
}

// What a month keeps on average, what of it tops up investments, and the rest
export const keptMoney = (state: AppState, month: string): KeptMoney => {
  const { baseCurrency, rates } = state.settings;
  const average = averageKept(state, month);
  const topUps = state.investments.reduce(
    (sum, inv) => sum + convert(inv.monthlyContribution ?? 0, inv.currency, baseCurrency, rates),
    0,
  );
  return { average, topUps, toAccounts: average - topUps };
};

// The average spending of the last six months that had any
const averageSpend = (state: AppState, month: string) => {
  const spending = monthlySeries(state.transactions, month, 6, state.settings).filter((entry) => entry.expense > 0);
  return spending.length > 0 ? spending.reduce((sum, entry) => sum + entry.expense, 0) / spending.length : 0;
};

// The money month by month for some years, with a low and a high return beside it
export const forecast = (state: AppState, today: string, inputs: ForecastInputs) => {
  const { settings } = state;
  const base = settings.baseCurrency;
  const startMonth = monthOf(today);
  const { years, view, returnPct, spreadPct, inflationOn, withDebts, withSaving } = inputs;
  const events = inputs.events.map((event) => ({
    month: event.month,
    amount: convert(event.amount, event.currency, base, settings.rates),
  }));
  const mix = inflationMix(state, today);
  const kept = keptMoney(state, startMonth);
  const monthlySaving = withSaving ? kept.toAccounts : 0;
  const shift = scheduleShift(state, startMonth);
  const savingShift = withSaving ? shift : undefined;
  const months = years * 12;
  // The shift of every month ahead, added up over some months
  const shiftOver = (count: number) =>
    Array.from({ length: count }, (_, index) => shift(addMonths(startMonth, index + 1))).reduce((a, b) => a + b, 0);
  // The projection at a yearly return
  const projectionFor = (savingsReturnPct: number) =>
    buildProjection(state, today, months, {
      savingsReturnPct,
      events,
      includeDebts: withDebts,
      monthlySaving,
      savingShift,
    });
  const projection = projectionFor(returnPct);
  const lowRun = projectionFor(returnPct - spreadPct);
  const highRun = projectionFor(returnPct + spreadPct);
  const last = projection.length - 1;
  const monthlyInflation = inflationOn ? mix.pct / 100 / 12 : 0;
  // A base-currency figure of a month in the shown currency, less inflation
  const show = (value: number, index: number) =>
    convert(value, base, view, settings.rates) / Math.pow(1 + monthlyInflation, index);
  const first = projection[0] ?? NO_POINT;
  const endPoint = projection.at(-1) ?? NO_POINT;
  const nowTotal = show(first.net, 0);
  const endTotal = show(endPoint.net, last);
  const spend = averageSpend(state, startMonth);
  const freedomIndex =
    spend > 0 ? projection.findIndex((point) => (point.total * SAFE_WITHDRAWAL_PCT) / 100 / 12 >= spend) : -1;
  const passiveNow = (first.total * SAFE_WITHDRAWAL_PCT) / 100 / 12;
  const added = (kept.topUps + monthlySaving) * months + (withSaving ? shiftOver(months) : 0);
  const deposits = Math.max(0, show(added, last));
  const growth = Math.max(0, endTotal - nowTotal - deposits);
  return {
    state,
    base,
    view,
    startMonth,
    inflationMix: mix,
    kept,
    scheduleShift: shiftOver(12) / 12,
    projection,
    show,
    assetsNow: first.net,
    nowTotal,
    endPoint,
    endTotal,
    endLow: show((lowRun.at(-1) ?? NO_POINT).net, last),
    endHigh: show((highRun.at(-1) ?? NO_POINT).net, last),
    points: projection.map((point, index) => ({
      label: point.month,
      a: show(point.savings, index),
      b: show(point.investments, index),
      low: show((lowRun[index] ?? point).total, index),
      high: show((highRun[index] ?? point).total, index),
    })),
    avgSpend: spend,
    freedomMonth: freedomIndex >= 0 ? (projection[freedomIndex]?.month ?? null) : null,
    coverNow: spend > 0 ? Math.min(100, (passiveNow / spend) * 100) : 0,
    split: { start: nowTotal, deposits, growth },
  };
};

export type Forecast = ReturnType<typeof forecast>;

export interface YearRow {
  month: string;
  index: number;
  savings: number;
  investments: number;
  debt: number;
  net: number;
  added: number | null;
  share: number;
}

// The projection a year apart in the shown currency, with what each year added
export const yearlyRows = (f: Forecast): YearRow[] => {
  const years = f.projection.flatMap((point, index) => (index % 12 === 0 ? [{ point, index }] : []));
  const nets = years.map(({ point, index }) => f.show(point.net, index));
  const top = Math.max(0, ...nets);
  return years.map(({ point, index }, row) => {
    const net = nets[row] ?? 0;
    const before = row > 0 ? nets[row - 1] : undefined;
    return {
      month: point.month,
      index,
      savings: f.show(point.savings, index),
      investments: f.show(point.investments, index),
      debt: f.show(point.debt, index),
      net,
      added: before === undefined ? null : net - before,
      share: top > 0 ? (net / top) * 100 : 0,
    };
  });
};
