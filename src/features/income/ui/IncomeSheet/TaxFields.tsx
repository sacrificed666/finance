"use client";

import { useStore } from "@/app/hooks";
import type { TaxRegimeId } from "@/features/data/model/types";
import { profileOf, type IncomeForm } from "@/features/income/model/incomeForm";
import { hasEsv, TAX_REGIMES, taxRegime } from "@/features/income/model/tax";
import { useI18n } from "@/shared/i18n/useI18n";
import Callout from "@/shared/ui/Callout/Callout";
import Field from "@/shared/ui/Field/Field";
import Select from "@/shared/ui/Select/Select";
import SwitchRow from "@/shared/ui/SwitchRow/SwitchRow";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./IncomeSheet.module.scss";

interface TaxFieldsProps {
  form: IncomeForm;
  onChange: (fields: Partial<IncomeForm>) => void;
}

// The regimes to pick from, without the one that means no tax
const REGIMES = TAX_REGIMES.filter((regime) => regime.id !== "none");

// The tax panel: whether to deduct, the regime, the ЄСВ and own rates
const TaxFields = ({ form, onChange }: TaxFieldsProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const settingsRegime = state.settings.tax.regime;
  const fallback: TaxRegimeId = settingsRegime === "none" ? "fop3" : settingsRegime;
  const selected = taxRegime(form.taxRegime);
  const profile = profileOf(form);
  // Picks a regime from the list by its id
  const pick = (id: string) => {
    const regime = REGIMES.find((item) => item.id === id);
    if (regime) onChange({ taxRegime: regime.id });
  };

  return (
    <div className={styles.tax}>
      <SwitchRow
        title={t("income.applyTax")}
        hint={t("income.applyTax.hint")}
        checked={form.taxRegime !== "none"}
        onChange={(on) => onChange({ taxRegime: on ? fallback : "none" })}
      />
      {form.taxRegime !== "none" && (
        <>
          <Field label={t("tax.field.regime")} hint={t(selected.hintKey)}>
            <Select value={form.taxRegime} onChange={(event) => pick(event.target.value)}>
              {REGIMES.map((regime) => (
                <option key={regime.id} value={regime.id}>
                  {t(regime.labelKey)}
                </option>
              ))}
            </Select>
          </Field>
          {hasEsv(form.taxRegime) && (
            <SwitchRow
              title={t("settings.tax.esv")}
              hint={t("settings.tax.esv.hint")}
              checked={form.taxEsv}
              onChange={(taxEsv) => onChange({ taxEsv })}
            />
          )}
          {selected.editable && (
            <>
              <Field label={t("tax.field.label")}>
                <TextInput
                  value={form.taxLabel}
                  maxLength={60}
                  placeholder={t("tax.field.label.placeholder")}
                  onChange={(event) => onChange({ taxLabel: event.target.value })}
                />
              </Field>
              <div className={styles.rates}>
                <Field label={t("tax.field.rate")}>
                  <TextInput
                    inputMode="decimal"
                    value={form.taxRate}
                    onChange={(event) => onChange({ taxRate: event.target.value })}
                    placeholder={t("common.example", { value: "6" })}
                  />
                </Field>
                <Field label={t("tax.field.fixed")}>
                  <TextInput
                    inputMode="decimal"
                    prefix="₴"
                    value={form.taxFixed}
                    onChange={(event) => onChange({ taxFixed: event.target.value })}
                    placeholder="0"
                  />
                </Field>
                <Field label={t("tax.field.vat")}>
                  <TextInput
                    inputMode="decimal"
                    value={form.taxVat}
                    onChange={(event) => onChange({ taxVat: event.target.value })}
                    placeholder="0"
                  />
                </Field>
              </div>
            </>
          )}
          {profile && profile.fixedUAH > 0 && <Callout tone="tip">{t("income.fixedPerEntry")}</Callout>}
        </>
      )}
    </div>
  );
};

export default TaxFields;
