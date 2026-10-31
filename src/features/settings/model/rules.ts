import type { AppState, CategoryRule } from "@/features/data/model/types";

// Whether a rule can be added: some text and a category of its type
export const ruleReady = (state: AppState, rule: Omit<CategoryRule, "id">): boolean =>
  rule.match.trim().length > 0 &&
  state.categories.some((entry) => entry.id === rule.categoryId && entry.kind === rule.type);

// The rules with one more
export const addRule = (state: AppState, rule: Omit<CategoryRule, "id">, makeId: () => string): AppState => {
  const rename = rule.rename?.trim().slice(0, 80);
  const added: CategoryRule = { id: makeId(), match: rule.match.trim(), categoryId: rule.categoryId, type: rule.type };
  return { ...state, rules: [...state.rules, rename ? { ...added, rename } : added] };
};

// The rules without one
export const removeRule = (state: AppState, id: string): AppState => ({
  ...state,
  rules: state.rules.filter((rule) => rule.id !== id),
});
