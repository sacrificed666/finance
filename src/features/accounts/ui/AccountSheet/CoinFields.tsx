"use client";

import { addHolding, type AccountForm } from "@/features/accounts/model/accountForm";
import { COINS, coinInfo, holdingsValue } from "@/features/accounts/model/coins";
import type { HoldingDraft } from "@/features/accounts/model/holdings";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDateTime } from "@/shared/lib/date";
import { formatMoney, parseAmount } from "@/shared/lib/money";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import Icon from "@/shared/ui/Icon/Icon";
import RemoteLogo from "@/shared/ui/RemoteLogo/RemoteLogo";
import Select from "@/shared/ui/Select/Select";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./AccountSheet.module.scss";

interface CoinFieldsProps {
  form: AccountForm;
  onChange: (fields: Partial<AccountForm>) => void;
  pricing: boolean;
  error: string | null;
  onLoadPrices: () => void;
}

// A crypto wallet's coins with their amounts and worth, priced on request
const CoinFields = ({ form, onChange, pricing, error, onLoadPrices }: CoinFieldsProps) => {
  const { t } = useI18n();
  // Changes one coin of the wallet
  const setHolding = (key: string, fields: Partial<HoldingDraft>) =>
    onChange({ holdings: form.holdings.map((holding) => (holding.key === key ? { ...holding, ...fields } : holding)) });
  const total = holdingsValue(
    form.holdings.map((holding) => ({
      coin: holding.coin,
      quantity: parseAmount(holding.quantity) || 0,
      price: holding.price,
    })),
  );

  return (
    <FieldSet label={t("balance.crypto.coins")} hint={t("balance.crypto.coins.hint", { currency: form.currency })}>
      <div className={styles.coins}>
        {form.holdings.length === 0 && <p className={styles.noCoins}>{t("balance.crypto.noCoins")}</p>}
        {form.holdings.map((holding) => {
          const info = coinInfo(holding.coin);
          const held = new Set(form.holdings.filter((item) => item.key !== holding.key).map((item) => item.coin));
          const quantity = parseAmount(holding.quantity);
          const worth = holding.price && Number.isFinite(quantity) && quantity > 0 ? quantity * holding.price : null;
          return (
            <div key={holding.key} className={styles.coin}>
              <div className={styles.coinLine}>
                <span className={styles.coinMark}>
                  <RemoteLogo
                    sources={holding.icon ? [holding.icon] : []}
                    fallback={<span className={styles.symbol}>{info?.symbol ?? "?"}</span>}
                    alt={info?.name ?? holding.coin}
                  />
                </span>
                <div className={styles.coinPicker}>
                  <Select
                    aria-label={t("balance.crypto.coin")}
                    value={holding.coin}
                    onChange={(event) =>
                      setHolding(holding.key, { coin: event.target.value, price: undefined, icon: undefined })
                    }
                  >
                    {COINS.filter((coin) => coin.id === holding.coin || !held.has(coin.id)).map((coin) => (
                      <option key={coin.id} value={coin.id}>
                        {coin.symbol} · {coin.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className={styles.coinAmount}>
                  <div className={styles.grow}>
                    <TextInput
                      inputMode="decimal"
                      aria-label={t("balance.crypto.amount")}
                      value={holding.quantity}
                      onChange={(event) => setHolding(holding.key, { quantity: event.target.value })}
                      placeholder={t("balance.crypto.amount")}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange({ holdings: form.holdings.filter((item) => item.key !== holding.key) })}
                    aria-label={t("balance.crypto.remove", { coin: info?.symbol ?? holding.coin })}
                    className={styles.removeCoin}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
              {worth !== null && holding.price !== undefined && (
                <p className={styles.worth}>
                  {t("balance.crypto.worth", {
                    value: formatMoney(worth, form.currency, { exact: true }),
                    price: formatMoney(holding.price, form.currency, { exact: true }),
                  })}
                </p>
              )}
            </div>
          );
        })}
        <div className={styles.coinActions}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(addHolding(form, uid))}
            disabled={form.holdings.length >= COINS.length}
          >
            <Icon name="plus" size={14} />
            {t("balance.crypto.addCoin")}
          </Button>
          {form.holdings.length > 0 && (
            <Button variant="ghost" size="sm" disabled={pricing} onClick={onLoadPrices}>
              <Icon name="refresh" size={14} className={cx(pricing && styles.spinning)} />
              {pricing ? t("common.loading") : t("balance.crypto.loadPrices")}
            </Button>
          )}
        </div>
        {form.holdings.some((holding) => holding.price) && (
          <p className={styles.total}>
            {t("balance.crypto.total", { value: formatMoney(total, form.currency, { exact: true }) })}
            {form.pricedAt && <span className={styles.pricedAt}> · {formatDateTime(form.pricedAt)}</span>}
          </p>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </FieldSet>
  );
};

export default CoinFields;
