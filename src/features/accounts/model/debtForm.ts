import type { AppState, Debt, DebtKind } from "@/features/data/model/types";
import { parseAmount, type Currency } from "@/shared/lib/money";

import { DEBT_KIND_ICON } from "./kinds";

export interface DebtForm {
  id: string | null;
  name: string;
  kind: DebtKind;
  currency: Currency;
  balance: string;
  principal: string;
  rate: string;
  monthlyPayment: string;
  note: string;
}

// A number typed in an optional field, or nothing for an empty or zero one
const optionalNumber = (raw: string): number | undefined => {
  if (raw.trim() === "") return undefined;
  const value = parseAmount(raw);
  return value ? value : undefined;
};

// Whether an optional field holds no number from zero to a limit
const outOfRange = (raw: string, max: number) => {
  if (raw.trim() === "") return false;
  const value = parseAmount(raw);
  return !Number.isFinite(value) || value < 0 || value > max;
};

// The form of a new debt, a mortgage in hryvnias, or of a stored one
export const initialDebtForm = (target: Debt | "new"): DebtForm =>
  target === "new"
    ? {
        id: null,
        name: "",
        kind: "mortgage",
        currency: "UAH",
        balance: "",
        principal: "",
        rate: "",
        monthlyPayment: "",
        note: "",
      }
    : {
        id: target.id,
        name: target.name,
        kind: target.kind,
        currency: target.currency,
        balance: String(target.balance),
        principal: target.principal === undefined ? "" : String(target.principal),
        rate: target.annualRatePct === undefined ? "" : String(target.annualRatePct),
        monthlyPayment: target.monthlyPayment === undefined ? "" : String(target.monthlyPayment),
        note: target.note ?? "",
      };

export type DebtProblem =
  | "balance.debt.problem.name"
  | "balance.debt.problem.balance"
  | "balance.debt.problem.principal"
  | "balance.inv.problem.rate"
  | "balance.debt.problem.payment";

// What stops the debt from being saved, the first problem only, or null
export const debtProblem = (form: DebtForm): DebtProblem | null => {
  if (!form.name.trim()) return "balance.debt.problem.name";
  const balance = parseAmount(form.balance);
  if (!Number.isFinite(balance) || balance < 0) return "balance.debt.problem.balance";
  if (outOfRange(form.principal, 1e12)) return "balance.debt.problem.principal";
  if (outOfRange(form.rate, 200)) return "balance.inv.problem.rate";
  if (outOfRange(form.monthlyPayment, 1e12)) return "balance.debt.problem.payment";
  return null;
};

// The debts with the form's debt changed in place or added
export const saveDebt = (state: AppState, form: DebtForm, makeId: () => string): AppState => {
  const fields = {
    name: form.name.trim(),
    icon: DEBT_KIND_ICON[form.kind],
    kind: form.kind,
    currency: form.currency,
    balance: parseAmount(form.balance),
    principal: optionalNumber(form.principal),
    annualRatePct: optionalNumber(form.rate),
    monthlyPayment: optionalNumber(form.monthlyPayment),
    note: form.note.trim() || undefined,
  };
  const id = form.id;
  return {
    ...state,
    debts: id
      ? state.debts.map((debt) => (debt.id === id ? { ...debt, ...fields } : debt))
      : [...state.debts, { id: makeId(), ...fields }],
  };
};

// The debts without one
export const deleteDebt = (state: AppState, id: string): AppState => ({
  ...state,
  debts: state.debts.filter((debt) => debt.id !== id),
});
