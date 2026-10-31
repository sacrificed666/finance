"use client";

import { useStore } from "@/app/hooks";
import { formPolicy, navWorth, type InvestmentForm } from "@/features/investments/model/investmentForm";
import { INZHUR_FUNDS, inzhurFund } from "@/features/investments/model/inzhur";
import { useReturnLabels } from "@/features/investments/model/useReturnLabels";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatMoney, formatNumber, formatPercent, parseAmount } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import Fact from "@/shared/ui/Fact/Fact";
import Facts from "@/shared/ui/Facts/Facts";
import Field from "@/shared/ui/Field/Field";
import Icon from "@/shared/ui/Icon/Icon";
import Select from "@/shared/ui/Select/Select";

import styles from "./InvestmentSheet.module.scss";

interface InzhurFieldsProps {
  form: InvestmentForm;
  loading: boolean;
  error: string | null;
  onFund: (fundId: string) => void;
  onLoad: () => void;
}

// The fund of an Inzhur position, its latest price and its forecast
const InzhurFields = ({ form, loading, error, onFund, onLoad }: InzhurFieldsProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const { returnLabel, yieldLabel } = useReturnLabels();
  const fund = inzhurFund(form.fund);
  const worth = navWorth(form, state.settings);
  const quote = form.quote;
  let navText = <p className={styles.hint}>{loading ? t("common.loading") : t("balance.inv.inzhur.navHint")}</p>;
  if (form.nav !== null) {
    navText = (
      <>
        <p className={styles.strong}>
          {t("balance.inv.inzhur.nav", { nav: formatMoney(form.nav, "UAH", { exact: true }) })}
        </p>
        {worth !== null && (
          <p className={styles.worth}>
            {t("balance.inv.inzhur.worth", {
              count: formatNumber(parseAmount(form.quantity), 4),
              value: formatMoney(worth, form.currency, { exact: true }),
            })}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <Field label={t("balance.inv.inzhur.fund")} hint={t("balance.inv.inzhur.fund.hint")}>
        <Select value={form.fund} onChange={(event) => onFund(event.target.value)}>
          {INZHUR_FUNDS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {t(item.themeKey)}
            </option>
          ))}
        </Select>
      </Field>
      <div className={styles.nav}>
        <div className={styles.navText}>
          {navText}
          {error && <p className={styles.error}>{error}</p>}
        </div>
        <Button variant="ghost" size="sm" disabled={loading} onClick={onLoad}>
          <Icon name="refresh" size={14} className={cx(loading && styles.spinning)} />
          {loading ? t("common.loading") : t("balance.inv.inzhur.loadNav")}
        </Button>
      </div>
      {fund && (
        <Facts>
          <Fact label={t("balance.inv.inzhur.forecast")} wide>
            {yieldLabel(
              quote?.projectedYieldPct ?? fund.projectedYieldPct,
              quote ? quote.projectedYieldMaxPct : fund.projectedYieldMaxPct,
              quote?.projectedCurrency ?? fund.linkedCurrency,
            )}
          </Fact>
          {quote?.actualYieldPct !== undefined && (
            <Fact label={t("balance.inv.inzhur.actual")}>
              {t("balance.perYear", { pct: formatPercent(quote.actualYieldPct) })}
              {quote.actualYieldCurrency ? ` · ${quote.actualYieldCurrency}` : ""}
            </Fact>
          )}
          <Fact label={t("balance.inv.row.return")}>{returnLabel(formPolicy(form), form.kind, form.freq)}</Fact>
        </Facts>
      )}
    </>
  );
};

export default InzhurFields;
