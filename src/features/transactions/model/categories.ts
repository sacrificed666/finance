import { spentInCategory } from "@/features/data/model/finmath";
import type { AppState, Budget, Category, CategoryKind, RecurringRule } from "@/features/data/model/types";
import { addMonths } from "@/shared/lib/date";
import type { Currency } from "@/shared/lib/money";

// The categories of a kind as parents, each with its subcategories
export const categoryTree = (categories: readonly Category[], kind: CategoryKind) => {
  const ofKind = categories.filter((entry) => entry.kind === kind);
  const ids = new Set(ofKind.map((entry) => entry.id));
  const parents = ofKind.filter((entry) => !entry.parentId || !ids.has(entry.parentId));
  return parents.map((parent) => ({ parent, children: ofKind.filter((entry) => entry.parentId === parent.id) }));
};

// A category with its subcategories
export const descendantsOf = (categories: readonly Category[], id: string): Set<string> => {
  const ids = new Set([id]);
  for (const entry of categories) if (entry.parentId === id) ids.add(entry.id);
  return ids;
};

// The month's spending in a currency under a budget's category and subcategories
export const spentInBudget = (state: AppState, categoryId: string, currency: Currency, month: string): number =>
  [...descendantsOf(state.categories, categoryId)].reduce(
    (sum, id) => sum + spentInCategory(state.transactions, id, month, currency, state.settings),
    0,
  );

// What was moved into a budget in a month, or out of it when negative
export const movedIn = (budget: Budget, month: string): number => budget.moved?.[month] ?? 0;

// A budget's limit in a month with moves and, if it carries, last month's rest
export const budgetLimit = (state: AppState, budget: Budget, month: string): number => {
  const moved = movedIn(budget, month);
  if (!budget.rollover || budget.period === "yearly") return budget.limit + moved;
  const previous = addMonths(month, -1);
  const unspent =
    budget.limit + movedIn(budget, previous) - spentInBudget(state, budget.categoryId, budget.currency, previous);
  return budget.limit + moved + Math.max(0, unspent);
};

// The expense rules of a month that post exactly the budget of their category
export const plansBookedAsSpending = (state: AppState, month: string): RecurringRule[] =>
  state.recurring.filter(
    (rule) =>
      rule.type === "expense" &&
      rule.startMonth <= month &&
      (!rule.endMonth || rule.endMonth >= month) &&
      state.budgets.some(
        (budget) =>
          budget.categoryId === rule.categoryId &&
          budget.currency === rule.currency &&
          Math.abs(budget.limit - rule.amount) < 1,
      ),
  );

// The default categories of bills
const FIXED_IDS = new Set([
  "cat-housing",
  "cat-rent",
  "cat-utilities",
  "cat-internet",
  "cat-insurance",
  "cat-subs",
  "cat-taxes",
  "cat-fees",
]);
// Words of bill categories in the app's languages
const FIXED_WORDS =
  /rent|оренд|utilit|комун|internet|інтернет|phone|телефон|insur|страх|loan|кредит|mortgage|іпотек|tax|податк|subscri|підписк|miete|loyer|alquiler|czynsz|affitto|huur/iu;

// Whether a category holds fixed bills rather than everyday spending
export const looksLikeFixedPayment = (category?: Category): boolean =>
  category !== undefined && (FIXED_IDS.has(category.id) || FIXED_WORDS.test(category.name));

// Services one subscribes to among the bills: streaming, phone and internet plans
const SERVICE_IDS = new Set(["cat-subs", "cat-internet"]);
const SERVICE_WORDS = /subscri|підписк|internet|інтернет|phone|телефон|abonne|abonn|suscrip/iu;

// Whether a category holds bills such as rent or utilities, not a subscription
export const looksLikeBill = (category?: Category): boolean =>
  category !== undefined &&
  looksLikeFixedPayment(category) &&
  !SERVICE_IDS.has(category.id) &&
  !SERVICE_WORDS.test(category.name);
