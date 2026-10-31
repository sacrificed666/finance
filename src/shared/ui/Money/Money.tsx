import { cx } from "@/shared/lib/cx";
import { type Currency, formatMoney } from "@/shared/lib/money";

import styles from "./Money.module.scss";

interface MoneyProps {
  amount: number;
  currency: Currency;
  compact?: boolean;
  sign?: boolean;
  exact?: boolean;
  className?: string;
}

// An amount in its currency with figures that line up in columns
const Money = ({ amount, currency, compact, sign, exact, className }: MoneyProps) => (
  <span className={cx(styles.money, className)}>{formatMoney(amount, currency, { compact, sign, exact })}</span>
);

export default Money;
