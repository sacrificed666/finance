"use client";

import { useStore } from "@/app/hooks";
import { displayCurrencies } from "@/features/data/model/currencies";
import type { Settings } from "@/features/data/model/types";
import { convert, type Currency, formatMoney } from "@/shared/lib/money";
import Money from "@/shared/ui/Money/Money";

import styles from "./TripleMoney.module.scss";

interface TripleMoneyProps {
  amount: number;
  currency: Currency;
  settings: Settings;
}

// An amount in its own currency, the same in the other currencies under it
const TripleMoney = ({ amount, currency, settings }: TripleMoneyProps) => {
  const { state } = useStore();
  const others = displayCurrencies(state).filter((other) => other !== currency);
  return (
    <div>
      <Money amount={amount} currency={currency} exact className={styles.main} />
      <p className={styles.others}>
        {others
          .map((other) => formatMoney(convert(amount, currency, other, settings.rates), other, { exact: true }))
          .join("  ·  ")}
      </p>
    </div>
  );
};

export default TripleMoney;
