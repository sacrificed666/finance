"use client";

import { useStore } from "@/app/hooks";
import type { TaxProfile } from "@/features/data/model/types";
import { hasEsv, profileFromRegime, regimeParts, TAX_REGIMES, taxRegime } from "@/features/income/model/tax";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatMoney, formatPercent } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import Field from "@/shared/ui/Field/Field";
import Select from "@/shared/ui/Select/Select";
import SwitchRow from "@/shared/ui/SwitchRow/SwitchRow";

import styles from "./TaxCard.module.scss";

// The tax regime the app plans for: none, a sole proprietor's group or own rates
const TaxCard = () => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const { tax } = state.settings;
  const regime = taxRegime(tax.regime);
  const parts = regimeParts(tax.regime, tax.esv);
  // Saves the tax settings, keeping the rest of the settings
  const save = (next: TaxProfile) => update((s) => ({ ...s, settings: { ...s.settings, tax: next } }));
  // Picks a regime from the list by its id
  const pick = (id: string) => {
    const next = TAX_REGIMES.find((item) => item.id === id);
    if (next) save(profileFromRegime(next.id, tax));
  };

  return (
    <Card id="taxes" title={t("settings.tax.title")} subtitle={t("settings.tax.subtitle")} icon="receipt">
      <div className={styles.fields}>
        <Field label={t("tax.field.regime")} hint={t(regime.hintKey)}>
          <Select value={tax.regime} onChange={(event) => pick(event.target.value)}>
            {TAX_REGIMES.map((item) => (
              <option key={item.id} value={item.id}>
                {t(item.labelKey)}
              </option>
            ))}
          </Select>
        </Field>
        {hasEsv(tax.regime) && (
          <SwitchRow
            title={t("settings.tax.esv")}
            hint={t("settings.tax.esv.hint")}
            checked={tax.esv}
            onChange={(esv) => save(profileFromRegime(tax.regime, { ...tax, esv }))}
          />
        )}
        {parts.length > 0 && (
          <ul aria-label={t("settings.tax.parts")} className={styles.parts}>
            {parts.map((part) => (
              <li key={part.id} className={styles.part}>
                <span>{t(part.labelKey)}</span>
                <span className={styles.rate}>
                  {part.ratePct === undefined
                    ? t("settings.tax.monthly", { amount: formatMoney(part.fixedUAH ?? 0, "UAH") })
                    : formatPercent(part.ratePct, 0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};

export default TaxCard;
