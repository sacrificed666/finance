import type { Compounding, CompoundingFreq, Investment, InvestmentKind } from "@/features/data/model/types";

import { inzhurFund } from "./inzhur";

export type ReturnStyle = "interest" | "coupons" | "dividends" | "growth";

export interface ReturnPolicy {
  style: ReturnStyle;
  choices: readonly Compounding[];
  compounding: Compounding;
  compoundingFreq: CompoundingFreq;
  freqChoice: boolean;
}

interface ReturnRule {
  style: ReturnStyle;
  choices: readonly [Compounding, ...Compounding[]];
}

// How each kind of position pays back, and what its owner may choose
const BY_KIND: Record<InvestmentKind, ReturnRule> = {
  deposit: { style: "interest", choices: ["reinvest", "payout"] },
  bonds: { style: "coupons", choices: ["payout"] },
  reit: { style: "dividends", choices: ["payout", "reinvest"] },
  inzhur: { style: "dividends", choices: ["payout", "reinvest"] },
  stocks: { style: "growth", choices: ["reinvest"] },
  crypto: { style: "growth", choices: ["reinvest"] },
  other: { style: "growth", choices: ["reinvest"] },
};

// A position that only grows in price
const GROWTH: ReturnRule = { style: "growth", choices: ["reinvest"] };

// How a position pays back, its compounding settled to a choice it allows
export const returnPolicy = (
  inv: Pick<Investment, "kind" | "fund" | "compounding" | "compoundingFreq">,
): ReturnPolicy => {
  const rule = inv.kind === "inzhur" && inzhurFund(inv.fund)?.income !== "dividends" ? GROWTH : BY_KIND[inv.kind];
  const compounding = rule.choices.includes(inv.compounding) ? inv.compounding : rule.choices[0];
  const freqChoice = rule.style === "interest" && compounding === "reinvest";
  let compoundingFreq = inv.compoundingFreq;
  if (!freqChoice && inv.kind === "inzhur" && rule.style === "dividends") compoundingFreq = "monthly";
  else if (!freqChoice && rule.style === "growth") compoundingFreq = "annually";
  return { style: rule.style, choices: rule.choices, compounding, compoundingFreq, freqChoice };
};
