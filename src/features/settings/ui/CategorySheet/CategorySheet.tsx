"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { ICON_CHOICES } from "@/features/data/model/defaults";
import type { Category, CategoryKind } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { leastUsedSlot, saveCategory, type CategoryForm } from "@/features/settings/model/categoryList";
import { useI18n } from "@/shared/i18n/useI18n";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import Field from "@/shared/ui/Field/Field";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import NameField from "@/shared/ui/NameField/NameField";
import Select from "@/shared/ui/Select/Select";
import Sheet from "@/shared/ui/Sheet/Sheet";

import ColorPicker from "./ColorPicker";

interface CategorySheetProps {
  editing: Category | null;
  parentId: string;
  kind: CategoryKind;
  onClose: () => void;
  onAddedChild: (parentId: string) => void;
}

// Adds or edits a category: its name, parent, emoji and colour
const CategorySheet = ({ editing, parentId, kind, onClose, onAddedChild }: CategorySheetProps) => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const nameOf = useCategoryName();
  const [form, setForm] = useState<CategoryForm>(() => {
    if (editing) {
      return {
        name: nameOf(editing),
        icon: editing.icon,
        colorSlot: editing.colorSlot,
        parentId: editing.parentId ?? "",
      };
    }
    const parent = state.categories.find((entry) => entry.id === parentId);
    return {
      name: "",
      icon: ICON_CHOICES[0] ?? "🏷️",
      colorSlot: parent?.colorSlot ?? leastUsedSlot(state, kind),
      parentId,
    };
  });
  const hasChildren = editing !== null && state.categories.some((entry) => entry.parentId === editing.id);
  const problem = form.name.trim() === "" ? t("settings.categories.nameIt") : null;
  const parents = state.categories.filter(
    (entry) => entry.kind === (editing?.kind ?? kind) && !entry.parentId && entry.id !== editing?.id,
  );
  // Changes some fields of the form
  const change = (fields: Partial<CategoryForm>) => setForm((current) => ({ ...current, ...fields }));

  // Saves the category; a new child unfolds its parent
  const submit = () => {
    if (problem) return;
    update((s) => saveCategory(s, form, editing, kind, uid, nameOf));
    if (!editing && form.parentId) onAddedChild(form.parentId);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      onSubmit={submit}
      problem={problem}
      title={editing ? t("settings.categories.edit") : t("settings.categories.new")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={problem !== null}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <NameField
        label={t("common.name")}
        value={form.name}
        onChange={(name) => change({ name })}
        placeholder={t("settings.categories.namePlaceholder")}
        icon={{
          value: form.icon,
          options: ICON_CHOICES,
          onChange: (icon) => change({ icon }),
          label: t("common.icon"),
        }}
      />
      <Field
        label={t("settings.categories.parent")}
        hint={hasChildren ? t("settings.categories.parentLocked") : t("settings.categories.parent.hint")}
      >
        <Select
          value={hasChildren ? "" : form.parentId}
          disabled={hasChildren}
          onChange={(event) => {
            const parent = state.categories.find((entry) => entry.id === event.target.value);
            change({ parentId: event.target.value, colorSlot: parent?.colorSlot ?? form.colorSlot });
          }}
        >
          <option value="">{t("settings.categories.topLevel")}</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.icon} {nameOf(parent)}
            </option>
          ))}
        </Select>
      </Field>
      <FieldSet label={t("common.color")} hint={t("settings.categories.color.hint")}>
        <ColorPicker value={form.colorSlot} onChange={(colorSlot) => change({ colorSlot })} />
      </FieldSet>
    </Sheet>
  );
};

export default CategorySheet;
