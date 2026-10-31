import type { Category, CategoryKind } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { useI18n } from "@/shared/i18n/useI18n";
import type { PickerGroup, PickerItem } from "@/shared/ui/OptionPicker/OptionPicker";

import { categoryTree } from "./categories";

// Categories of some kinds for a picker, each parent above its subcategories
export const useCategoryGroups = (
  categories: Category[],
  kinds: CategoryKind[],
  lead: PickerItem[] = [],
): PickerGroup[] => {
  const { t } = useI18n();
  const category = useCategoryName();
  const groups: PickerGroup[] = lead.length > 0 ? [{ items: lead }] : [];
  for (const kind of kinds) {
    const items: PickerItem[] = [];
    for (const { parent, children } of categoryTree(categories, kind)) {
      items.push({
        value: parent.id,
        label: category(parent),
        icon: parent.icon,
        hint: children.length > 0 ? t("category.general") : undefined,
      });
      for (const child of children)
        items.push({ value: child.id, label: category(child), icon: child.icon, child: true });
    }
    if (items.length > 0) groups.push({ label: kinds.length > 1 ? t(`tx.type.${kind}`) : undefined, items });
  }
  return groups;
};
