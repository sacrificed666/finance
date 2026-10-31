"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { mergeDefaultCategories } from "@/features/data/model/defaults";
import type { Category, CategoryKind } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import {
  categoryRows,
  categoryUse,
  deleteBlock,
  hasNesting,
  type DeleteBlock,
} from "@/features/settings/model/categoryList";
import CategorySheet from "@/features/settings/ui/CategorySheet/CategorySheet";
import { useI18n } from "@/shared/i18n/useI18n";
import { todayISO } from "@/shared/lib/date";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import ConfirmDialog from "@/shared/ui/ConfirmDialog/ConfirmDialog";
import Icon from "@/shared/ui/Icon/Icon";
import SearchInput from "@/shared/ui/SearchInput/SearchInput";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";

import CategoryRow from "./CategoryRow";

import styles from "./CategoriesCard.module.scss";

interface SheetTarget {
  editing: Category | null;
  parentId: string;
}

// The categories of a kind as a tree to search, fold, edit and prune
const CategoriesCard = () => {
  const { state, update } = useStore();
  const { t, tp } = useI18n();
  const nameOf = useCategoryName();
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [note, setNote] = useState<string | null>(null);
  const use = categoryUse(state, todayISO());
  const rows = categoryRows(state, kind, query, expanded, nameOf);
  const nested = hasNesting(state, kind);
  const expenses = state.categories.filter((entry) => entry.kind === "expense").length;
  const deleting = state.categories.find((entry) => entry.id === deleteId);

  // Why a category cannot be deleted, as a sentence
  const blockText = (block: DeleteBlock | null): string | null => {
    if (!block) return null;
    if (block.reason === "children") return tp("settings.categories.hasChildren", block.count);
    const parts = [
      block.records > 0 && tp("settings.categories.records", block.records),
      block.rules > 0 && tp("settings.categories.rules", block.rules),
      block.budgets > 0 && t("settings.categories.aBudget"),
    ].filter(Boolean);
    return t("settings.categories.inUse", { parts: parts.join(", ") });
  };
  // Unfolds or folds a parent's children; every parent starts folded
  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // Unfolds a parent that just got a child
  const expand = (id: string) => setExpanded((current) => new Set([...current, id]));

  // Deletes the category with an undo, and lets saved views go of it
  const confirmDelete = () => {
    if (!deleteId) return;
    update(
      (s) => ({
        ...s,
        categories: s.categories.filter((entry) => entry.id !== deleteId),
        settings: {
          ...s.settings,
          ledgerViews: s.settings.ledgerViews?.map((view) =>
            view.categoryId === deleteId ? { ...view, categoryId: "" } : view,
          ),
        },
      }),
      t("settings.categories.deleted"),
    );
    setDeleteId(null);
  };

  // Adds the default categories that are missing and links renamed ones
  const restoreDefaults = () => {
    const merged = mergeDefaultCategories(state.categories);
    if (merged.added === 0 && merged.linked === 0) {
      setNote(t("settings.categories.defaultsUpToDate"));
      return;
    }
    update(
      (s) => ({ ...s, categories: mergeDefaultCategories(s.categories).categories }),
      t("settings.categories.defaultsRestored"),
    );
    setNote(t("settings.categories.defaultsSummary", { added: merged.added, linked: merged.linked }));
  };

  return (
    <Card
      id="categories"
      title={t("settings.categories.title")}
      subtitle={t("settings.categories.subtitle", { count: state.categories.length })}
      icon="tag"
      action={<AddButton size="sm" onClick={() => setSheet({ editing: null, parentId: "" })} label={t("common.add")} />}
    >
      <SegmentedControl<CategoryKind>
        label={t("settings.categories.kind")}
        options={[
          { value: "expense", label: `${t("settings.categories.expenses")} (${String(expenses)})` },
          {
            value: "income",
            label: `${t("settings.categories.income")} (${String(state.categories.length - expenses)})`,
          },
        ]}
        value={kind}
        onChange={setKind}
      />
      <div className={styles.search}>
        <SearchInput value={query} onChange={setQuery} placeholder={t("settings.categories.search")} />
      </div>
      <ul className={styles.rows}>
        {rows.length === 0 && (
          <li className={styles.none}>{query.trim() ? t("filter.noMatches") : t("settings.categories.none")}</li>
        )}
        {rows.map(({ category, child, children }) => (
          <CategoryRow
            key={category.id}
            category={category}
            child={child}
            childCount={children}
            records={use.get(category.id)?.recorded ?? 0}
            nested={nested}
            collapsed={!expanded.has(category.id)}
            blocked={blockText(deleteBlock(state, use, category.id))}
            onToggle={() => toggle(category.id)}
            onEdit={() => setSheet({ editing: category, parentId: category.parentId ?? "" })}
            onAddChild={() => setSheet({ editing: null, parentId: category.id })}
            onDelete={() => setDeleteId(category.id)}
          />
        ))}
      </ul>
      <div className={styles.defaults}>
        <Button variant="ghost" size="sm" onClick={restoreDefaults}>
          <Icon name="layers" size={14} />
          {t("settings.categories.restoreDefaults")}
        </Button>
        {note && <span className={styles.note}>{note}</span>}
      </div>

      {sheet && (
        <CategorySheet
          key={sheet.editing?.id ?? `new:${sheet.parentId}`}
          editing={sheet.editing}
          parentId={sheet.parentId}
          kind={kind}
          onClose={() => setSheet(null)}
          onAddedChild={expand}
        />
      )}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title={t("settings.categories.deleteTitle")}
        message={t("settings.categories.deleteMessage", { name: deleting ? nameOf(deleting) : "" })}
      />
    </Card>
  );
};

export default CategoriesCard;
