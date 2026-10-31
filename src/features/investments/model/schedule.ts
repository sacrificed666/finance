import { investmentAt, projectedSnapshot } from "@/features/data/model/finmath";
import type { AppState, Investment } from "@/features/data/model/types";
import { convert } from "@/shared/lib/money";

import { valuationOf } from "./kinds";
import { oneYearFrom } from "./positions";

export type DatedInvestment = Investment & { endDate: string };

// Whether a position has an end date
const isDated = (inv: Investment): inv is DatedInvestment => inv.endDate !== undefined;

// Positions in the order they end
const byEnd = (a: DatedInvestment, b: DatedInvestment) => a.endDate.localeCompare(b.endDate);

// What a position pays out between today and a year on
const paidOverYear = (inv: Investment, today: string, yearOut: string) =>
  valuationOf(inv.kind) === "market"
    ? projectedSnapshot(inv, today, yearOut).paidOut
    : investmentAt(inv, yearOut).paidOut - investmentAt(inv, today).paidOut;

export interface InvestmentSchedule {
  topUps: number;
  payoutsYear: number;
  maturing: DatedInvestment[];
  matured: DatedInvestment[];
}

// The monthly top-ups and yearly payouts of the open positions, and their ends
export const investmentSchedule = (state: AppState, today: string): InvestmentSchedule => {
  const { baseCurrency, rates } = state.settings;
  const yearOut = oneYearFrom(today);
  // An amount of a position in the base currency
  const toBase = (amount: number, inv: Investment) => convert(amount, inv.currency, baseCurrency, rates);
  const open = state.investments.filter((inv) => !inv.endDate || inv.endDate > today);
  return {
    topUps: open.reduce((sum, inv) => sum + toBase(inv.monthlyContribution ?? 0, inv), 0),
    payoutsYear: open.reduce((sum, inv) => sum + toBase(Math.max(0, paidOverYear(inv, today, yearOut)), inv), 0),
    maturing: open.filter(isDated).toSorted(byEnd),
    matured: state.investments
      .filter(isDated)
      .filter((inv) => inv.endDate <= today)
      .toSorted(byEnd),
  };
};

// Whether the schedule has anything to show
export const hasSchedule = (schedule: InvestmentSchedule): boolean =>
  schedule.topUps > 0 || schedule.payoutsYear > 0 || schedule.maturing.length > 0 || schedule.matured.length > 0;
