import { useI18n } from "@/shared/i18n/useI18n";

import { categoryName } from "./categoryName";
import type { Category } from "./types";

// Names categories in the page language
export const useCategoryName = () => {
  const i18n = useI18n();
  return (category: Pick<Category, "id" | "name"> | undefined) => categoryName(i18n, category);
};
