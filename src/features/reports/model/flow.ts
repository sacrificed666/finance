import type { Report } from "./report";

export interface FlowPart {
  id: string;
  value: number;
}

export interface MoneyFlow {
  sources: FlowPart[];
  uses: FlowPart[];
  total: number;
}

// The parts gathered past the shown ones, what was kept and what came from savings
export const FLOW_OTHER = "flow:other";
export const FLOW_KEPT = "flow:kept";
export const FLOW_SAVINGS = "flow:savings";

// The least share of the whole a part needs to stand on its own
const MIN_SHARE = 0.03;

// The largest parts; the small ones and what they miss of the whole as one more
const largest = (parts: Map<string, number>, whole: number, count: number): FlowPart[] => {
  const sorted = [...parts]
    .filter(([, value]) => value >= whole * MIN_SHARE)
    .map(([id, value]) => ({ id, value }))
    .toSorted((a, b) => b.value - a.value);
  const shown = sorted.slice(0, count);
  const rest = whole - shown.reduce((sum, part) => sum + part.value, 0);
  return rest > 0.5 ? [...shown, { id: FLOW_OTHER, value: rest }] : shown;
};

// Where a period's money came from and went: sources, categories, kept or drawn
export const moneyFlow = (r: Report, sources = 4, uses = 6): MoneyFlow | null => {
  const { income, expense, bySource, byCategory } = r.current;
  if (income <= 0 || expense <= 0) return null;
  const from = largest(bySource, income, sources);
  const to = largest(byCategory, expense, uses);
  const kept = income - expense;
  if (kept > 0.5) to.push({ id: FLOW_KEPT, value: kept });
  if (kept < -0.5) from.push({ id: FLOW_SAVINGS, value: -kept });
  return { sources: from, uses: to, total: Math.max(income, expense) };
};
