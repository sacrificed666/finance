import type { InvestmentKind, Valuation } from "@/features/data/model/types";

export interface InvestmentKindInfo {
  value: InvestmentKind;
  icon: string;
  valuation: Valuation;
}

// Every kind of position: deposits and bonds accrue, the rest follow the market
export const INVESTMENT_KINDS: InvestmentKindInfo[] = [
  { value: "deposit", icon: "🏦", valuation: "accrual" },
  { value: "bonds", icon: "📜", valuation: "accrual" },
  { value: "reit", icon: "🏢", valuation: "market" },
  { value: "inzhur", icon: "🏛️", valuation: "market" },
  { value: "stocks", icon: "📈", valuation: "market" },
  { value: "crypto", icon: "🪙", valuation: "market" },
  { value: "other", icon: "📦", valuation: "market" },
];

// The kinds by their names
const KIND_BY_VALUE = new Map(INVESTMENT_KINDS.map((kind) => [kind.value, kind]));

// The series colour of each kind of position
const INVESTMENT_SLOT: Record<InvestmentKind, number> = {
  deposit: 7,
  bonds: 8,
  reit: 9,
  inzhur: 14,
  stocks: 10,
  crypto: 11,
  other: 12,
};

// A kind of position with its icon and valuation, or a deposit for an unknown one
export const investmentKind = (kind: InvestmentKind): InvestmentKindInfo =>
  KIND_BY_VALUE.get(kind) ?? { value: "deposit", icon: "🏦", valuation: "accrual" };

// The series colour that marks a kind of position in charts
export const investmentColorSlot = (kind: InvestmentKind): number => INVESTMENT_SLOT[kind];

// Whether a kind of position accrues at a rate or is worth its market value
export const valuationOf = (kind: InvestmentKind): Valuation => investmentKind(kind).valuation;
