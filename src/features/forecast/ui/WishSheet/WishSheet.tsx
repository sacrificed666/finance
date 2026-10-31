"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import type { WishItem, WishPriority } from "@/features/data/model/types";
import {
  deleteWish,
  initialWishForm,
  saveWish,
  WISH_ICONS,
  WISH_PRIORITIES,
  wishProblem,
  type WishForm,
} from "@/features/forecast/model/wishlist";
import { useI18n } from "@/shared/i18n/useI18n";
import { todayISO } from "@/shared/lib/date";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import Field from "@/shared/ui/Field/Field";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import MoneyField from "@/shared/ui/MoneyField/MoneyField";
import MonthInput from "@/shared/ui/MonthInput/MonthInput";
import NameField from "@/shared/ui/NameField/NameField";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Sheet from "@/shared/ui/Sheet/Sheet";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./WishSheet.module.scss";

interface WishSheetProps {
  target: WishItem | "new";
  onClose: () => void;
}

// Adds or edits a wish: its name, emoji, price, priority, month and link
const WishSheet = ({ target, onClose }: WishSheetProps) => {
  const { update } = useStore();
  const { t } = useI18n();
  const [form, setForm] = useState<WishForm>(() => initialWishForm(target));
  const problem = wishProblem(form);
  // Changes some fields of the form
  const change = (fields: Partial<WishForm>) => setForm((current) => ({ ...current, ...fields }));

  // Saves the wish and closes the sheet
  const save = () => {
    if (problem) return;
    const today = todayISO();
    update((s) => saveWish(s, form, target, uid, today));
    onClose();
  };

  // Deletes the stored wish with an undo
  const remove = () => {
    if (target === "new") return;
    update((s) => deleteWish(s, target.id), t("wish.deleted"));
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      onSubmit={save}
      problem={problem && t(problem)}
      title={target === "new" ? t("wish.new") : t("wish.edit")}
      footer={
        <>
          {target !== "new" && (
            <Button variant="danger" className={styles.delete} onClick={remove}>
              {t("common.delete")}
            </Button>
          )}
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
        placeholder={t("common.example", { value: t("wish.namePlaceholder") })}
        maxLength={80}
        icon={{ value: form.icon, options: WISH_ICONS, onChange: (icon) => change({ icon }), label: t("common.icon") }}
      />
      <MoneyField
        label={t("wish.price")}
        value={form.price}
        onChange={(price) => change({ price })}
        currency={form.currency}
        onCurrency={(currency) => change({ currency })}
        currencyLabel={t("common.currency")}
        hero
      />
      <FieldSet label={t("wish.priority")}>
        <SegmentedControl<WishPriority>
          label={t("wish.priority")}
          options={WISH_PRIORITIES.map((priority) => ({ value: priority, label: t(`wish.priority.${priority}`) }))}
          value={form.priority}
          onChange={(priority) => change({ priority })}
        />
      </FieldSet>
      <FieldSet label={t("wish.month")} hint={t("wish.month.hint")}>
        <MonthInput name={t("wish.month")} value={form.month} onChange={(month) => change({ month })} allowEmpty />
      </FieldSet>
      <Field label={t("wish.url")} hint={t("common.optional")}>
        <TextInput
          value={form.url}
          onChange={(event) => change({ url: event.target.value })}
          placeholder="https://…"
          inputMode="url"
        />
      </Field>
      <Field label={t("common.note")}>
        <TextInput
          value={form.note}
          onChange={(event) => change({ note: event.target.value })}
          placeholder={t("common.optional")}
        />
      </Field>
    </Sheet>
  );
};

export default WishSheet;
