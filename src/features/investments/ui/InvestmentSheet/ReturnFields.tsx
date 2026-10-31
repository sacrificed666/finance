"use client";

import type { Compounding, CompoundingFreq } from "@/features/data/model/types";
import { formPolicy, type InvestmentForm } from "@/features/investments/model/investmentForm";
import { useReturnLabels } from "@/features/investments/model/useReturnLabels";
import { useI18n } from "@/shared/i18n/useI18n";
import Field from "@/shared/ui/Field/Field";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import Icon from "@/shared/ui/Icon/Icon";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Select from "@/shared/ui/Select/Select";

import styles from "./InvestmentSheet.module.scss";

// How often interest can be added to a deposit
const FREQUENCIES: readonly CompoundingFreq[] = ["monthly", "quarterly", "annually"];

interface ReturnFieldsProps {
  form: InvestmentForm;
  onChange: (fields: Partial<InvestmentForm>) => void;
}

// How the position pays back: a choice when its kind has one, a note otherwise
const ReturnFields = ({ form, onChange }: ReturnFieldsProps) => {
  const { t } = useI18n();
  const { returnLabel } = useReturnLabels();
  const policy = formPolicy(form);
  const interest = policy.style === "interest";
  const title = interest ? t("balance.inv.interestType") : t("balance.inv.dividends");
  // The name of one way to take the return
  const choiceLabel = (choice: Compounding) => {
    if (interest) return choice === "reinvest" ? t("balance.inv.reinvest") : t("balance.inv.payout");
    return choice === "reinvest" ? t("balance.inv.dividends.reinvest") : t("balance.inv.dividends.payout");
  };

  return (
    <>
      {policy.choices.length > 1 && (
        <FieldSet label={title} hint={interest ? t("balance.inv.interestType.hint") : t("balance.inv.dividends.hint")}>
          <SegmentedControl<Compounding>
            label={title}
            options={policy.choices.map((choice) => ({ value: choice, label: choiceLabel(choice) }))}
            value={policy.compounding}
            onChange={(compounding) => onChange({ compounding })}
          />
        </FieldSet>
      )}
      {policy.choices.length < 2 && form.kind !== "inzhur" && (
        <div className={styles.info}>
          <Icon name="info" size={16} className={styles.infoIcon} />
          <div className={styles.infoText}>
            <p className={styles.strong}>{returnLabel(policy, form.kind, form.freq)}</p>
            <p className={styles.hint}>{t(`balance.inv.style.${policy.style}.hint`)}</p>
          </div>
        </div>
      )}
      {policy.freqChoice && (
        <Field label={t("balance.inv.frequency")}>
          <Select
            value={form.freq}
            onChange={(event) => {
              const freq = FREQUENCIES.find((item) => item === event.target.value);
              if (freq) onChange({ freq });
            }}
          >
            {FREQUENCIES.map((freq) => (
              <option key={freq} value={freq}>
                {t(`freq.${freq}`)}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </>
  );
};

export default ReturnFields;
