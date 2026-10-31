"use client";

import { useEffect, useRef, useState } from "react";

import { useStore } from "@/app/hooks";
import { useAccountGroups } from "@/features/accounts/model/useAccountGroups";
import {
  connectBank,
  disconnectBank,
  fetchBankStatus,
  lastDays,
  loadStatement,
  setBankWebhook,
  type BankAccount,
  type BankProblem,
  type BankStatus,
} from "@/features/import/api/bank";
import { candidateFromMono, type ImportCandidate } from "@/features/import/model/import";
import { useI18n } from "@/shared/i18n/useI18n";
import { pad } from "@/shared/lib/date";
import { CURRENCY_SYMBOL, formatMoney, type Currency } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import ExternalLink from "@/shared/ui/ExternalLink/ExternalLink";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Switch from "@/shared/ui/Switch/Switch";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./ImportCard.module.scss";

type Period = "7" | "14" | "31";

// The local day of a moment given in seconds
const dateOf = (seconds: number) => {
  const at = new Date(seconds * 1000);
  return `${String(at.getFullYear())}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
};

// Whether a bank account keeps money in a currency the app knows
const isTrackable = (account: BankAccount): account is BankAccount & { currency: Currency } =>
  account.currency !== null;

interface MonobankPanelProps {
  busy: boolean;
  onStatus: (status: string | null) => void;
  onError: (error: string | null) => void;
  onFound: (found: ImportCandidate[]) => void;
}

// Monobank: linking it, booking its accounts and loading statements
const MonobankPanel = ({ busy, onStatus, onError, onFound }: MonobankPanelProps) => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const [bank, setBank] = useState<BankStatus | null>(null);
  const [token, setToken] = useState("");
  const [period, setPeriod] = useState<Period>("31");
  const alive = useRef(true);
  const links = state.settings.bankLinks ?? {};
  const accountGroups = useAccountGroups(
    state.savings,
    [{ value: "", label: t("import.mono.skip") }],
    Object.values(links),
  );
  const trackable = bank?.accounts.filter(isTrackable) ?? [];
  const linked = trackable.filter((account) => links[account.id]);

  // Loads the linked bank once and notices when the card goes away
  useEffect(() => {
    alive.current = true;
    void fetchBankStatus().then((status) => {
      if (alive.current) setBank(status);
    });
    return () => {
      alive.current = false;
    };
  }, []);

  // What went wrong with the bank, as a sentence
  const problemText = (problem: BankProblem) => {
    if (problem.kind === "token") return t("import.mono.badToken");
    if (problem.kind === "https") return t("import.mono.hook.https");
    if (problem.kind === "wait") return t("import.mono.wait", { s: problem.seconds });
    return t("import.mono.failed");
  };

  // Links the bank with the typed token
  const connect = async () => {
    onError(null);
    onStatus(t("import.mono.connecting"));
    const answer = await connectBank(token);
    onStatus(null);
    if (!answer.ok) {
      onError(problemText(answer.problem));
      return;
    }
    setBank(answer.status);
    setToken("");
  };

  // Turns the instant updates on or off
  const setHook = async (on: boolean) => {
    onError(null);
    onStatus(t("import.mono.hook.saving"));
    const answer = await setBankWebhook(on);
    onStatus(null);
    if (answer.ok) setBank(answer.status);
    else onError(problemText(answer.problem));
  };

  // Unlinks the bank
  const disconnect = async () => {
    await disconnectBank();
    setBank({ connected: false, name: "", accounts: [], fetchedAt: null, webhook: false });
  };

  // Books a bank account into one of the app's, or into none
  const setLink = (bankId: string, accountId: string) =>
    update((s) => {
      const next = Object.fromEntries(Object.entries(s.settings.bankLinks ?? {}).filter(([id]) => id !== bankId));
      return { ...s, settings: { ...s.settings, bankLinks: accountId ? { ...next, [bankId]: accountId } : next } };
    });

  // Loads the linked accounts' statements one after another, then shows them
  const load = async () => {
    onError(null);
    const { from, to } = lastDays(Number(period));
    const found: ImportCandidate[] = [];
    // Loads one account and moves on to the next, false when it stopped
    const next = async (index: number): Promise<boolean> => {
      const account = linked[index];
      if (!account) return true;
      const answer = await loadStatement(account.id, from, to, {
        stopped: () => !alive.current,
        onLoad: () => onStatus(t("import.mono.loading", { card: account.maskedPan || account.id.slice(0, 6) })),
        onWait: (seconds) => onStatus(t("import.mono.wait", { s: seconds })),
      });
      if (!answer) return false;
      if (!answer.ok) {
        onStatus(null);
        onError(problemText(answer.problem));
        return false;
      }
      for (const line of answer.items) {
        found.push(candidateFromMono(state, line, account.currency, links[account.id], dateOf(line.time)));
      }
      return next(index + 1);
    };
    if (!(await next(0))) return;
    onStatus(null);
    onFound(found);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <p className={styles.panelTitle}>
          Monobank
          {bank?.connected && <span className={styles.owner}> · {bank.name}</span>}
        </p>
        {bank?.connected && (
          <Button variant="ghost" size="sm" onClick={() => void disconnect()}>
            {t("import.mono.disconnect")}
          </Button>
        )}
      </div>

      {bank?.connected ? (
        <div className={styles.body}>
          <ul className={styles.rows}>
            {trackable.map((account) => (
              <li key={account.id} className={styles.account}>
                <IconDisc colorSlot={account.kind === "jar" ? 2 : 5} size="md">
                  {account.kind === "jar" ? "🫙" : "💳"}
                </IconDisc>
                <span className={styles.accountText}>
                  <span className={styles.accountName}>
                    {account.kind === "jar"
                      ? (account.title ?? t("import.mono.jar"))
                      : account.maskedPan || account.type}
                  </span>
                  <span className={styles.balance}>
                    {formatMoney(account.balance, account.currency)} · {CURRENCY_SYMBOL[account.currency]}
                    {account.creditLimit
                      ? ` · ${t("import.mono.limit", { amount: formatMoney(account.creditLimit, account.currency, { compact: true }) })}`
                      : ""}
                  </span>
                </span>
                <span className={styles.bookTo}>
                  <OptionPicker
                    size="sm"
                    label={t("import.mono.bookTo")}
                    value={links[account.id] ?? ""}
                    onChange={(accountId) => setLink(account.id, accountId)}
                    groups={accountGroups}
                  />
                </span>
              </li>
            ))}
          </ul>
          <div className={styles.load}>
            <SegmentedControl<Period>
              size="sm"
              label={t("import.mono.period")}
              options={(["7", "14", "31"] as const).map((days) => ({
                value: days,
                label: t("dash.ahead.days", { days: Number(days) }),
              }))}
              value={period}
              onChange={setPeriod}
            />
            <Button size="sm" onClick={() => void load()} disabled={busy || linked.length === 0}>
              {t("import.mono.load")}
            </Button>
          </div>
          {linked.length === 0 && <p className={styles.caption}>{t("import.mono.linkFirst")}</p>}
          <div className={styles.hook}>
            <div className={styles.hookText}>
              <p className={styles.hookTitle}>{t("import.mono.hook")}</p>
              <p className={styles.caption}>{bank.webhook ? t("import.mono.hook.on") : t("import.mono.hook.off")}</p>
            </div>
            <Switch checked={bank.webhook} onChange={(on) => void setHook(on)} label={t("import.mono.hook")} />
          </div>
        </div>
      ) : (
        <div className={styles.body}>
          <p className={styles.caption}>
            {t("import.mono.how")}{" "}
            <ExternalLink href="https://api.monobank.ua/" icon={false} className={styles.link}>
              api.monobank.ua
            </ExternalLink>
          </p>
          <div className={styles.connect}>
            <div className={styles.token}>
              <TextInput
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={t("import.mono.token")}
                aria-label={t("import.mono.token")}
                autoComplete="off"
              />
            </div>
            <Button onClick={() => void connect()} disabled={token.trim().length < 20 || busy}>
              {t("import.mono.connect")}
            </Button>
          </div>
          <p className={styles.caption}>{t("import.mono.private")}</p>
        </div>
      )}
    </div>
  );
};

export default MonobankPanel;
