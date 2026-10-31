import { addMonths } from "@/shared/lib/date";

export type PayoffStrategy = "avalanche" | "snowball";

export interface PayoffDebt {
  id: string;
  balance: number;
  ratePct: number;
  payment: number;
}

export interface PayoffPlan {
  months: number;
  interest: number;
  finalMonth: string;
  cleared: Array<{ id: string; month: string }>;
  neverPaysOff: boolean;
}

const LIMIT = 600;
const CENT = 0.005;

// The debts in the order extra money goes to: the dearest first, or the smallest
const order = (debts: readonly (PayoffDebt & { left: number })[], strategy: PayoffStrategy) =>
  debts.toSorted((a, b) =>
    strategy === "avalanche" ? b.ratePct - a.ratePct || a.left - b.left : a.left - b.left || b.ratePct - a.ratePct,
  );

// Pays the debts month by month; a plan adds an extra and rolls freed payments
export const planPayoff = (
  debts: PayoffDebt[],
  fromMonth: string,
  plan?: { extra: number; strategy: PayoffStrategy },
): PayoffPlan => {
  const open = debts
    .filter((debt) => debt.balance > CENT)
    .map((debt) => ({
      id: debt.id,
      balance: debt.balance,
      ratePct: debt.ratePct,
      payment: debt.payment,
      left: debt.balance,
    }));
  const rollOver = plan !== undefined;
  const extra = Math.max(0, plan?.extra ?? 0);
  const strategy = plan?.strategy ?? "avalanche";
  const cleared: PayoffPlan["cleared"] = [];
  let interest = 0;
  let month = 0;
  while (open.some((d) => d.left > CENT) && month < LIMIT) {
    const label = addMonths(fromMonth, month);
    let pool = extra;
    for (const d of open) {
      if (d.left <= CENT) {
        if (rollOver) pool += d.payment;
        continue;
      }
      const charge = d.left * (d.ratePct / 100 / 12);
      interest += charge;
      d.left += charge;
      const paid = Math.min(d.payment, d.left);
      d.left -= paid;
      if (rollOver) pool += d.payment - paid;
    }
    for (const d of order(
      open.filter((x) => x.left > CENT),
      strategy,
    )) {
      if (pool <= CENT) break;
      const paid = Math.min(pool, d.left);
      d.left -= paid;
      pool -= paid;
    }
    for (const d of open) {
      if (d.left <= CENT && !cleared.some((c) => c.id === d.id)) {
        d.left = 0;
        cleared.push({ id: d.id, month: label });
      }
    }
    month++;
  }
  const neverPaysOff = open.some((d) => d.left > CENT);
  return {
    months: neverPaysOff ? Infinity : month,
    interest: neverPaysOff ? Infinity : interest,
    finalMonth: neverPaysOff || month === 0 ? "" : addMonths(fromMonth, month - 1),
    cleared,
    neverPaysOff,
  };
};
