"use client";

import { useEffect, useState } from "react";

import { useStore } from "@/app/hooks";
import { bankCheckRows } from "@/features/accounts/model/bankCheck";
import AccountMark from "@/features/accounts/ui/AccountMark/AccountMark";
import { fetchBankStatus, refreshBankStatus, type BankStatus } from "@/features/import/api/bank";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDateShort, formatTime, pad, todayISO } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import Badge from "@/shared/ui/Badge/Badge";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import Icon from "@/shared/ui/Icon/Icon";

import styles from "./BankCheckCard.module.scss";

interface BankCheckCardProps {
  onMatch: (accountId: string, amount: number) => void;
}

// The linked bank's balances beside the app's, with a way to match a different one
const BankCheckCard = ({ onMatch }: BankCheckCardProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const linked = Object.keys(state.settings.bankLinks ?? {}).length > 0;
  const [bank, setBank] = useState<BankStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Reads the balances the server kept from the bank once a link exists
  useEffect(() => {
    if (!linked) return;
    let alive = true;
    void fetchBankStatus().then((status) => {
      if (alive) setBank(status);
    });
    return () => {
      alive = false;
    };
  }, [linked]);

  if (!bank?.connected) return null;
  const today = todayISO();
  const rows = bankCheckRows(state, bank.accounts, today);
  if (rows.length === 0) return null;
  const off = rows.filter((row) => Math.abs(row.diff) >= 0.01).length;

  // When the bank last moved a balance: the time today, or the day and time
  const when = (unix?: number) => {
    if (!unix) return "";
    const at = new Date(unix * 1000);
    const day = `${String(at.getFullYear())}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
    const time = formatTime(at.toISOString());
    return day === today ? time : `${formatDateShort(day)}, ${time}`;
  };
  // Asks the bank for fresh balances and says why when it cannot
  const checkNow = async () => {
    setBusy(true);
    setNote(null);
    const answer = await refreshBankStatus();
    if ("status" in answer) setBank(answer.status);
    else if ("waitSeconds" in answer) setNote(t("bankcheck.wait", { seconds: answer.waitSeconds }));
    else setNote(t("bankcheck.failed"));
    setBusy(false);
  };

  return (
    <Card
      title={t("bankcheck.title")}
      subtitle={off > 0 ? t("bankcheck.subtitle.off") : t("bankcheck.subtitle.ok")}
      icon="bank"
      action={
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void checkNow()}>
          <Icon name="refresh" size={14} />
          {t("bankcheck.check")}
        </Button>
      }
    >
      <ul className={styles.rows}>
        {rows.map(({ bank: account, account: own, app, diff }) => (
          <li key={account.id} className={styles.row}>
            <AccountMark account={own} />
            <span className={styles.body}>
              <span className={styles.name}>{own.name}</span>
              <span className={styles.bank}>
                {t("bankcheck.bank", {
                  amount: formatMoney(account.balance, own.currency),
                  time: when(account.balanceAt),
                })}
                {account.creditLimit
                  ? ` · ${t("import.mono.limit", { amount: formatMoney(account.creditLimit, own.currency, { compact: true }) })}`
                  : ""}
              </span>
            </span>
            {Math.abs(diff) < 0.01 ? (
              <Badge tone="income">
                <Icon name="check" size={11} strokeWidth={3} />
                {t("bankcheck.matches")}
              </Badge>
            ) : (
              <span className={styles.off}>
                <span className={cx(styles.diff, diff > 0 ? styles.more : styles.less)}>
                  {formatMoney(diff, own.currency, { sign: true })}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onMatch(own.id, account.balance)}
                  title={t("bankcheck.match.hint", { amount: formatMoney(app, own.currency) })}
                >
                  {t("bankcheck.match")}
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
      {note && <p className={styles.note}>{note}</p>}
    </Card>
  );
};

export default BankCheckCard;
