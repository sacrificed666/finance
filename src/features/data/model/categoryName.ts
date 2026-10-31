import type { I18n } from "@/shared/i18n/translate";

import { DEFAULT_CATEGORY_NAMES, LEGACY_DEFAULT_NAMES } from "./defaults";
import type { Category } from "./types";

// A category's name: built-in ones translated, the ones the user renamed kept
export const categoryName = (i18n: I18n, category: Pick<Category, "id" | "name"> | undefined): string => {
  if (!category) return i18n.t("common.uncategorized");
  const defaultName = DEFAULT_CATEGORY_NAMES.get(category.id);
  const untouched =
    defaultName !== undefined && (category.name === defaultName || LEGACY_DEFAULT_NAMES[category.id] === category.name);
  return untouched ? i18n.tk(`category.${category.id}`, category.name) : category.name;
};
