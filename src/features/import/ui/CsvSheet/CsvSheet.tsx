"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { activeAccounts } from "@/features/accounts/model/accounts";
import { useAccountGroups } from "@/features/accounts/model/useAccountGroups";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { candidatesFromCsv, type CsvDraft, type CsvMapping } from "@/features/import/model/csv";
import type { ImportCandidate } from "@/features/import/model/import";
import { useI18n } from "@/shared/i18n/useI18n";
import { CURRENCY_OPTIONS, type Currency } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import Field from "@/shared/ui/Field/Field";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Select from "@/shared/ui/Select/Select";
import Sheet from "@/shared/ui/Sheet/Sheet";

import styles from "./CsvSheet.module.scss";

interface CsvSheetProps {
  draft: CsvDraft;
  onChange: (draft: CsvDraft) => void;
  onClose: () => void;
  onPreview: (found: ImportCandidate[]) => void;
}

// Which statement columns mean what, the currency and the account to book into
const CsvSheet = ({ draft, onChange, onClose, onPreview }: CsvSheetProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const category = useCategoryName();
  const [currency, setCurrency] = useState<Currency>(state.settings.baseCurrency);
  const [accountId, setAccountId] = useState(activeAccounts(state.savings)[0]?.id ?? "");
  const accountGroups = useAccountGroups(state.savings, [{ value: "", label: t("common.notAssigned") }], [accountId]);
  const { mapping } = draft;
  const columns = [
    { value: "-1", label: "-" },
    ...draft.header.map((title, index) => ({ value: String(index), label: title || `#${String(index + 1)}` })),
  ];
  const mapped = mapping.date >= 0 && mapping.amount >= 0;
  const found = mapped
    ? candidatesFromCsv(state, draft.rows, mapping, currency, category).map((candidate) =>
        Object.assign({}, candidate, { accountId: candidate.accountId ?? (accountId || undefined) }),
      )
    : [];
  let problem: string | null = null;
  if (!mapped) problem = t("import.csv.needColumns");
  else if (found.length === 0) problem = t("import.csv.nothing");

  // A picker of the column that plays a role
  const column = (role: keyof CsvMapping, label: string, optional = false) => (
    <Field label={label} hint={optional ? t("common.optional") : undefined}>
      <Select
        size="sm"
        value={String(mapping[role])}
        onChange={(event) => onChange({ ...draft, mapping: { ...mapping, [role]: Number(event.target.value) } })}
      >
        {columns.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  );

  return (
    <Sheet
      open
      onClose={onClose}
      title={t("import.csv.title")}
      problem={problem}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => onPreview(found)} disabled={problem !== null}>
            {tp("import.csv.preview", found.length)}
          </Button>
        </>
      }
    >
      <p className={styles.file}>
        {draft.name} · {tp("import.csv.rows", draft.rows.length)}
      </p>
      <div className={styles.columns}>
        {column("date", t("common.date"))}
        {column("amount", t("common.amount"))}
        {column("description", t("import.csv.description"))}
        {column("debit", t("import.csv.debit"), true)}
        {column("mcc", "MCC", true)}
        {column("category", t("common.category"), true)}
        {column("account", t("import.csv.accountColumn"), true)}
        {column("currency", t("common.currency"), true)}
        {column("type", t("tx.kind"), true)}
        {column("payee", t("import.csv.payee"), true)}
      </div>
      <p className={styles.apps}>{t("import.csv.apps")}</p>
      <FieldSet label={t("common.currency")}>
        <SegmentedControl
          label={t("common.currency")}
          options={CURRENCY_OPTIONS}
          value={currency}
          onChange={setCurrency}
        />
      </FieldSet>
      <Field label={t("import.csv.account")}>
        <OptionPicker
          label={t("import.csv.account")}
          value={accountId}
          onChange={setAccountId}
          groups={accountGroups}
        />
      </Field>
    </Sheet>
  );
};

export default CsvSheet;
