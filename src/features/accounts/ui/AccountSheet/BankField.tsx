"use client";

import type { AccountForm } from "@/features/accounts/model/accountForm";
import {
  BRAND_GROUP_LABEL_KEY,
  BRAND_GROUP_ORDER,
  BRANDS,
  brandInfo,
  brandLogoSources,
  type BrandGroup,
} from "@/features/accounts/model/brands";
import { useI18n } from "@/shared/i18n/useI18n";
import Field from "@/shared/ui/Field/Field";
import Monogram from "@/shared/ui/Monogram/Monogram";
import RemoteLogo from "@/shared/ui/RemoteLogo/RemoteLogo";
import Select from "@/shared/ui/Select/Select";

import styles from "./AccountSheet.module.scss";

interface BankFieldProps {
  form: AccountForm;
  onChange: (fields: Partial<AccountForm>) => void;
}

// The brands a crypto wallet may belong to
const CRYPTO_GROUPS: BrandGroup[] = ["crypto", "fintech"];

// The account's bank or service, its logo beside the picker once chosen
const BankField = ({ form, onChange }: BankFieldProps) => {
  const { t } = useI18n();
  const brand = brandInfo(form.bank);
  return (
    <Field label={t("balance.acc.bank")} hint={t("balance.acc.bank.hint")}>
      <div className={styles.picker}>
        {brand && (
          <span className={styles.preview}>
            <RemoteLogo
              sources={brandLogoSources(form.bank)}
              fallback={<Monogram name={brand.name} color={brand.color} />}
            />
          </span>
        )}
        <div className={styles.select}>
          <Select value={form.bank} onChange={(event) => onChange({ bank: event.target.value })}>
            <option value="">{t("balance.acc.noBank")}</option>
            {(form.kind === "crypto" ? CRYPTO_GROUPS : BRAND_GROUP_ORDER).map((group) => (
              <optgroup key={group} label={t(BRAND_GROUP_LABEL_KEY[group])}>
                {BRANDS.filter((item) => item.group === group).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>
      </div>
    </Field>
  );
};

export default BankField;
