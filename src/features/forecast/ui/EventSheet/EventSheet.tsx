"use client";

import { useState } from "react";

import type { PlannedEvent } from "@/features/data/model/types";
import type { EventDraft } from "@/features/forecast/model/events";
import { positiveAmount } from "@/features/forecast/model/goal";
import { useI18n } from "@/shared/i18n/useI18n";
import { type Currency } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import Field from "@/shared/ui/Field/Field";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import MoneyField from "@/shared/ui/MoneyField/MoneyField";
import MonthInput from "@/shared/ui/MonthInput/MonthInput";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Sheet from "@/shared/ui/Sheet/Sheet";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./EventSheet.module.scss";

interface EventSheetProps {
  target: PlannedEvent | "new";
  initial: EventDraft;
  currencies: Currency[];
  onSave: (draft: EventDraft) => void;
  onDelete: () => void;
  onClose: () => void;
}

// Adds or edits a one-off sum: in or out, how much, what for and when
const EventSheet = ({ target, initial, currencies, onSave, onDelete, onClose }: EventSheetProps) => {
  const { t } = useI18n();
  const [draft, setDraft] = useState(initial);
  const ready = positiveAmount(draft.amount) > 0;
  // Changes some fields of the draft
  const change = (fields: Partial<EventDraft>) => setDraft((current) => ({ ...current, ...fields }));

  return (
    <Sheet
      open
      onClose={onClose}
      onSubmit={() => {
        if (ready) onSave(draft);
      }}
      title={target === "new" ? t("forecast.events.new") : t("forecast.events.edit")}
      footer={
        <>
          {target !== "new" && (
            <Button variant="danger" className={styles.delete} onClick={onDelete}>
              {t("common.delete")}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={!ready}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <FieldSet label={t("forecast.events.direction")}>
        <SegmentedControl<EventDraft["sign"]>
          label={t("forecast.events.direction")}
          options={[
            { value: "out", label: t("forecast.events.out") },
            { value: "in", label: t("forecast.events.in") },
          ]}
          value={draft.sign}
          onChange={(sign) => change({ sign })}
        />
      </FieldSet>
      <MoneyField
        label={t("common.amount")}
        value={draft.amount}
        onChange={(amount) => change({ amount })}
        currency={draft.currency}
        onCurrency={(currency) => change({ currency })}
        currencyLabel={t("common.currency")}
        currencies={currencies}
        hero
      />
      <FieldSet label={t("forecast.events.month")}>
        <MonthInput name={t("forecast.events.month")} value={draft.month} onChange={(month) => change({ month })} />
      </FieldSet>
      <Field label={t("common.note")}>
        <TextInput
          value={draft.note}
          onChange={(event) => change({ note: event.target.value })}
          placeholder={t("common.example", { value: t("forecast.events.notePlaceholder") })}
          maxLength={60}
        />
      </Field>
    </Sheet>
  );
};

export default EventSheet;
