"use client";

import { useStore } from "@/app/hooks";
import { setManualRate } from "@/features/settings/model/rates";
import { useRatesOrigin } from "@/features/settings/model/useRatesOrigin";
import { useI18n } from "@/shared/i18n/useI18n";
import { nextHourLabel } from "@/shared/lib/date";
import { CURRENCY_SYMBOL, FOREIGN_CURRENCIES, formatNumber } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import Icon from "@/shared/ui/Icon/Icon";

import NumericSetting from "./NumericSetting";

import styles from "./RatesCard.module.scss";

// The exchange rates, each one editable by hand, with where they came from
const RatesCard = () => {
  const { state, update } = useStore();
  const { settings } = state;
  const { t } = useI18n();
  const ratesOrigin = useRatesOrigin();
  return (
    <Card id="rates" title={t("settings.rates.title")} subtitle={t("settings.rates.subtitle")} icon="exchange">
      <div className={styles.fields}>
        {FOREIGN_CURRENCIES.map((currency) => {
          const meta = settings.ratesMeta?.[currency];
          return (
            <NumericSetting
              key={currency}
              label={`${currency} → UAH`}
              prefix={CURRENCY_SYMBOL.UAH}
              hint={
                meta
                  ? t("settings.rates.buySell", { buy: formatNumber(meta.buy), sell: formatNumber(meta.sell) })
                  : t("settings.rates.per", { symbol: CURRENCY_SYMBOL[currency] })
              }
              value={settings.rates[currency]}
              isValid={(value) => value > 0}
              onCommit={(value) => {
                const now = new Date().toISOString();
                update((s) => setManualRate(s, currency, value, now));
              }}
            />
          );
        })}
      </div>
      <div className={styles.origin}>
        <Icon name="refresh" size={14} className={styles.icon} />
        <p>
          <span className={styles.source}>{ratesOrigin(settings)}</span>
          <span className={styles.next}>{t("prices.nextUpdate", { time: nextHourLabel() })}</span>
        </p>
      </div>
      <p className={styles.explain}>{t("settings.rates.explain")}</p>
    </Card>
  );
};

export default RatesCard;
