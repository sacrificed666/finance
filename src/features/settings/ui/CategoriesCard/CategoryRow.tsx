"use client";

import type { Category } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import Icon from "@/shared/ui/Icon/Icon";

import IconAction from "./IconAction";

import styles from "./CategoriesCard.module.scss";

interface CategoryRowProps {
  category: Category;
  child: boolean;
  childCount: number;
  records: number;
  nested: boolean;
  collapsed: boolean;
  blocked: string | null;
  onToggle: () => void;
  onEdit: () => void;
  onAddChild: () => void;
  onDelete: () => void;
}

// A category with its fold button, entries count, add-child and delete
const CategoryRow = ({
  category,
  child,
  childCount,
  records,
  nested,
  collapsed,
  blocked,
  onToggle,
  onEdit,
  onAddChild,
  onDelete,
}: CategoryRowProps) => {
  const { t, tp } = useI18n();
  const meta = [
    childCount > 0 && tp("settings.categories.subs", childCount),
    records > 0 && tp("settings.categories.records", records),
  ]
    .filter(Boolean)
    .join(" · ");
  const nameOf = useCategoryName();
  const name = nameOf(category);
  const foldable = nested && !child && childCount > 0;
  return (
    <li className={cx(styles.row, child && styles.childRow)}>
      {foldable && (
        <button
          type="button"
          aria-label={collapsed ? t("common.expand") : t("common.collapse")}
          aria-expanded={!collapsed}
          onClick={onToggle}
          className={styles.fold}
        >
          <Icon
            name="chevronRight"
            size={14}
            strokeWidth={2.4}
            className={cx(styles.chevron, !collapsed && styles.open)}
          />
        </button>
      )}
      {nested && !foldable && <span aria-hidden className={styles.foldSpace} />}
      <button type="button" onClick={onEdit} className={cx(styles.edit, child ? styles.childEdit : styles.parentEdit)}>
        <span
          aria-hidden
          className={cx(styles.mark, child ? styles.childMark : styles.parentMark)}
          style={{
            backgroundColor: `color-mix(in oklab, var(--series-${String(category.colorSlot)}) 20%, transparent)`,
          }}
        >
          {category.icon}
        </span>
        <span className={styles.label}>
          <span className={styles.name}>{name}</span>
          {meta && <span className={styles.meta}>{meta}</span>}
        </span>
      </button>
      {child ? (
        <span aria-hidden className={styles.actionSpace} />
      ) : (
        <IconAction label={t("settings.categories.addSub", { name })} icon="plus" onClick={onAddChild} />
      )}
      <IconAction
        label={t("settings.categories.deleteNamed", { name })}
        reason={blocked}
        icon="trash"
        danger
        onClick={onDelete}
      />
    </li>
  );
};

export default CategoryRow;
