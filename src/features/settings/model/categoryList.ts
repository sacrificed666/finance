import type { AppState, Category, CategoryKind } from "@/features/data/model/types";

export interface CategoryUse {
  records: number;
  recorded: number;
  rules: number;
  budgets: number;
}

export type DeleteBlock =
  | { reason: "children"; count: number }
  | { reason: "inUse"; records: number; rules: number; budgets: number };

// How many entries, recorded ones, rules and budgets use each category
export const categoryUse = (state: AppState, today: string): ReadonlyMap<string, CategoryUse> => {
  const use = new Map<string, CategoryUse>();
  // Counts one use of a category
  const bump = (id: string, key: keyof CategoryUse) => {
    if (!id) return;
    const entry = use.get(id) ?? { records: 0, recorded: 0, rules: 0, budgets: 0 };
    use.set(id, { ...entry, [key]: entry[key] + 1 });
  };
  for (const tx of state.transactions) {
    bump(tx.categoryId, "records");
    if (tx.date <= today) bump(tx.categoryId, "recorded");
  }
  for (const rule of state.recurring) bump(rule.categoryId, "rules");
  for (const budget of state.budgets) bump(budget.categoryId, "budgets");
  return use;
};

// What keeps a category from being deleted: its subcategories or its uses
export const deleteBlock = (state: AppState, use: ReadonlyMap<string, CategoryUse>, id: string): DeleteBlock | null => {
  const children = state.categories.filter((entry) => entry.parentId === id).length;
  if (children > 0) return { reason: "children", count: children };
  const used = use.get(id);
  return used ? { reason: "inUse", records: used.records, rules: used.rules, budgets: used.budgets } : null;
};

export interface CategoryRow {
  category: Category;
  child: boolean;
  children: number;
}

// The categories of a kind as rows, children under parents, searched or folded
export const categoryRows = (
  state: AppState,
  kind: CategoryKind,
  query: string,
  expanded: ReadonlySet<string>,
  nameOf: (entry: Category) => string,
): CategoryRow[] => {
  const needle = query.trim().toLowerCase();
  // Whether a category's name has the search in it
  const matches = (entry: Category) => needle === "" || nameOf(entry).toLowerCase().includes(needle);
  return state.categories
    .filter((entry) => entry.kind === kind && !entry.parentId)
    .flatMap((parent) => {
      const kids = state.categories.filter((entry) => entry.parentId === parent.id && entry.kind === kind);
      const found = kids.filter(matches);
      if (!matches(parent) && found.length === 0) return [];
      let shown = expanded.has(parent.id) ? kids : [];
      if (needle !== "") shown = found;
      const head: CategoryRow[] = [{ category: parent, child: false, children: kids.length }];
      return head.concat(shown.map((kid) => ({ category: kid, child: true, children: 0 })));
    });
};

// Whether any category of a kind sits under another
export const hasNesting = (state: AppState, kind: CategoryKind): boolean =>
  state.categories.some((entry) => entry.kind === kind && Boolean(entry.parentId));

// The colour fewest categories of a kind use, for a new one
export const leastUsedSlot = (state: AppState, kind: CategoryKind): number => {
  const counts = new Map<number, number>();
  for (const entry of state.categories) {
    if (entry.kind === kind) counts.set(entry.colorSlot, (counts.get(entry.colorSlot) ?? 0) + 1);
  }
  return [2, 3, 4, 5, 6, 7, 8].reduce(
    (best, slot) => ((counts.get(slot) ?? 0) < (counts.get(best) ?? 0) ? slot : best),
    1,
  );
};

export interface CategoryForm {
  name: string;
  icon: string;
  colorSlot: number;
  parentId: string;
}

// The categories with one added or changed; a parent never gets a parent itself
export const saveCategory = (
  state: AppState,
  form: CategoryForm,
  editing: Category | null,
  kind: CategoryKind,
  makeId: () => string,
  nameOf: (entry: Category) => string,
): AppState => {
  const name = form.name.trim();
  const hasChildren = editing !== null && state.categories.some((entry) => entry.parentId === editing.id);
  const parentId = form.parentId && !hasChildren ? form.parentId : undefined;
  // The fields both a new and a changed category get
  const withParent = (entry: Category): Category => (parentId ? { ...entry, parentId } : entry);
  if (!editing) {
    const added = withParent({ id: makeId(), name, icon: form.icon, colorSlot: form.colorSlot, kind });
    return { ...state, categories: [...state.categories, added] };
  }
  return {
    ...state,
    categories: state.categories.map((entry) =>
      entry.id === editing.id
        ? withParent({
            id: entry.id,
            name: name === nameOf(entry) ? entry.name : name,
            icon: form.icon,
            colorSlot: form.colorSlot,
            kind: entry.kind,
          })
        : entry,
    ),
  };
};
