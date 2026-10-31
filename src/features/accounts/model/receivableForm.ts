import type { AppState, Receivable } from "@/features/data/model/types";
import { parseAmount, type Currency } from "@/shared/lib/money";

export interface ReceivableForm {
  id: string | null;
  name: string;
  currency: Currency;
  amount: string;
  repaid: string;
  date: string;
  dueDate: string;
  note: string;
}

// The form of a new loan to someone, lent today, or of a stored one
export const initialReceivableForm = (target: Receivable | "new", today: string): ReceivableForm =>
  target === "new"
    ? { id: null, name: "", currency: "UAH", amount: "", repaid: "", date: today, dueDate: "", note: "" }
    : {
        id: target.id,
        name: target.name,
        currency: target.currency,
        amount: String(target.amount),
        repaid: target.repaid > 0 ? String(target.repaid) : "",
        date: target.date,
        dueDate: target.dueDate ?? "",
        note: target.note ?? "",
      };

// The amount lent and the part repaid, an empty repaid field counting as zero
export const receivableFigures = (form: ReceivableForm) => ({
  amount: parseAmount(form.amount),
  repaid: form.repaid.trim() === "" ? 0 : parseAmount(form.repaid),
});

export type ReceivableProblem =
  | "receivables.problem.name"
  | "receivables.problem.amount"
  | "receivables.problem.repaid"
  | "receivables.problem.date";

// What stops the loan from being saved, the first problem only, or null
export const receivableProblem = (form: ReceivableForm): ReceivableProblem | null => {
  const { amount, repaid } = receivableFigures(form);
  if (!form.name.trim()) return "receivables.problem.name";
  if (!Number.isFinite(amount) || amount <= 0) return "receivables.problem.amount";
  if (!Number.isFinite(repaid) || repaid < 0 || repaid > amount) return "receivables.problem.repaid";
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(form.date)) return "receivables.problem.date";
  return null;
};

// The loans with the form's loan changed in place or added
export const saveReceivable = (state: AppState, form: ReceivableForm, makeId: () => string): AppState => {
  const { amount, repaid } = receivableFigures(form);
  const fields = {
    name: form.name.trim(),
    icon: "🤝",
    currency: form.currency,
    amount,
    repaid,
    date: form.date,
    dueDate: form.dueDate || undefined,
    note: form.note.trim() || undefined,
  };
  const id = form.id;
  return {
    ...state,
    receivables: id
      ? state.receivables.map((item) => (item.id === id ? { ...item, ...fields } : item))
      : [...state.receivables, { id: makeId(), ...fields }],
  };
};

// The loans without one
export const deleteReceivable = (state: AppState, id: string): AppState => ({
  ...state,
  receivables: state.receivables.filter((item) => item.id !== id),
});
