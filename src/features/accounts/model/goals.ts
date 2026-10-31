import { accountBalances } from "@/features/data/model/finmath";
import type { AppState, Goal, SavingsAccount } from "@/features/data/model/types";
import { monthDiff, monthOf } from "@/shared/lib/date";
import { convert, parseAmount, type Currency } from "@/shared/lib/money";

export interface GoalProgress {
  key: string;
  name: string;
  account?: SavingsAccount;
  goal?: Goal;
  currency: Currency;
  deadline?: string;
  have: number;
  target: number;
  progress: number;
  haveBase: number;
  targetBase: number;
  perMonthBase: number;
}

// How far a goal is and what reaching it on time takes a month
const progressOf = (
  state: AppState,
  today: string,
  fields: Pick<GoalProgress, "key" | "name" | "account" | "goal" | "currency" | "deadline" | "have" | "target">,
): GoalProgress => {
  const { settings } = state;
  // A sum of the goal's currency in the base currency
  const toBase = (amount: number) => convert(amount, fields.currency, settings.baseCurrency, settings.rates);
  const left = Math.max(0, fields.target - fields.have);
  const monthsLeft = fields.deadline ? Math.max(1, monthDiff(monthOf(today), monthOf(fields.deadline))) : null;
  return {
    ...fields,
    progress: Math.min(1, fields.have / fields.target),
    haveBase: toBase(Math.min(fields.have, fields.target)),
    targetBase: toBase(fields.target),
    perMonthBase: monthsLeft && left > 0 ? toBase(left) / monthsLeft : 0,
  };
};

// What a goal holds: the money put aside by hand and its accounts' balances
export const goalHave = (state: AppState, goal: Goal, balances: ReadonlyMap<string, number>): number =>
  goal.saved +
  (goal.accountIds ?? []).reduce((sum, id) => {
    const account = state.savings.find((item) => item.id === id);
    if (!account) return sum;
    return sum + convert(Math.max(0, balances.get(id) ?? 0), account.currency, goal.currency, state.settings.rates);
  }, 0);

// Account goals and goals of their own, with what each still needs
export const goalsSummary = (state: AppState, today: string) => {
  const balances = accountBalances(state, today);
  const ofAccounts = state.savings.flatMap((account): GoalProgress[] => {
    const goal = account.goal;
    if (!goal || goal.target <= 0) return [];
    return [
      progressOf(state, today, {
        key: `account:${account.id}`,
        name: account.name,
        account,
        currency: account.currency,
        deadline: goal.deadline,
        have: Math.max(0, balances.get(account.id) ?? 0),
        target: goal.target,
      }),
    ];
  });
  const own = state.goals.map((goal) =>
    progressOf(state, today, {
      key: `goal:${goal.id}`,
      name: goal.name,
      goal,
      currency: goal.currency,
      deadline: goal.deadline,
      have: goalHave(state, goal, balances),
      target: goal.target,
    }),
  );
  const goals = [...own, ...ofAccounts];
  return {
    goals,
    reached: goals.filter((goal) => goal.progress >= 1).length,
    haveTotal: goals.reduce((sum, goal) => sum + goal.haveBase, 0),
    targetTotal: goals.reduce((sum, goal) => sum + goal.targetBase, 0),
    perMonth: goals.reduce((sum, goal) => sum + goal.perMonthBase, 0),
  };
};

export interface GoalForm {
  id: string | null;
  name: string;
  icon: string;
  target: string;
  currency: Currency;
  deadline: string;
  saved: string;
  accountIds: string[];
}

// A new goal's form, or the edited one's
export const initialGoalForm = (target: Goal | "new", currency: Currency): GoalForm =>
  target === "new"
    ? { id: null, name: "", icon: "🎯", target: "", currency, deadline: "", saved: "", accountIds: [] }
    : {
        id: target.id,
        name: target.name,
        icon: target.icon,
        target: String(target.target),
        currency: target.currency,
        deadline: target.deadline ?? "",
        saved: target.saved > 0 ? String(target.saved) : "",
        accountIds: target.accountIds ?? [],
      };

export type GoalProblem = "goals.problem.name" | "goals.problem.target" | "goals.problem.saved";

// What stops a goal from being saved, the first problem only, or null
export const goalProblem = (form: GoalForm): GoalProblem | null => {
  if (form.name.trim() === "") return "goals.problem.name";
  const target = parseAmount(form.target);
  if (!Number.isFinite(target) || target <= 0) return "goals.problem.target";
  const saved = form.saved.trim() === "" ? 0 : parseAmount(form.saved);
  return Number.isFinite(saved) && saved >= 0 ? null : "goals.problem.saved";
};

// The goals with the form saved in place or added
export const saveGoal = (state: AppState, form: GoalForm, makeId: () => string): AppState => {
  const goal: Goal = {
    id: form.id ?? makeId(),
    name: form.name.trim().slice(0, 80),
    icon: form.icon || "🎯",
    target: parseAmount(form.target),
    currency: form.currency,
    saved: form.saved.trim() === "" ? 0 : parseAmount(form.saved),
    ...(form.deadline ? { deadline: form.deadline } : {}),
    ...(form.accountIds.length > 0 ? { accountIds: form.accountIds } : {}),
  };
  const exists = state.goals.some((item) => item.id === goal.id);
  return {
    ...state,
    goals: exists ? state.goals.map((item) => (item.id === goal.id ? goal : item)) : [...state.goals, goal],
  };
};

// The goals without one
export const deleteGoal = (state: AppState, id: string): AppState => ({
  ...state,
  goals: state.goals.filter((goal) => goal.id !== id),
});
