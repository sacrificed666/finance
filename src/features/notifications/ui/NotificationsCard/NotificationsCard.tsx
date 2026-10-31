"use client";

import { useEffect, useState } from "react";

import { useStore } from "@/app/hooks";
import {
  pushSetup,
  sendTest,
  subscribe,
  unsubscribe,
  type PushStatus,
} from "@/features/notifications/api/subscription";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import SwitchRow from "@/shared/ui/SwitchRow/SwitchRow";

import styles from "./NotificationsCard.module.scss";

type NotifyKind = "operations" | "budgets";

// The kinds of notification that can be turned off one by one
const KINDS: readonly NotifyKind[] = ["operations", "budgets"];

type SummaryChoice = "off" | "weekly" | "monthly";

// The summaries one can ask for, none first
const SUMMARIES: readonly SummaryChoice[] = ["off", "weekly", "monthly"];

// Push notifications in this browser: the switch, the kinds and a test
const NotificationsCard = () => {
  const { t } = useI18n();
  const { state, update } = useStore();
  const notify = state.settings.notify ?? {};
  const [status, setStatus] = useState<PushStatus>("loading");
  const [hour, setHour] = useState(9);
  const [key, setKey] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  // Finds out where notifications stand once, unless the card goes away first
  useEffect(() => {
    let alive = true;
    void pushSetup(process.env.NODE_ENV === "production").then((setup) => {
      if (!alive) return;
      setStatus(setup.status);
      setKey(setup.key);
      setHour(setup.hour);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Turns a kind of notification on or off; on is the default
  const setKind = (kind: NotifyKind, on: boolean) =>
    update((s) => ({
      ...s,
      settings: { ...s.settings, notify: { ...s.settings.notify, [kind]: on ? undefined : false } },
    }));

  // Asks for a weekly or monthly summary, or for none
  const setSummary = (summary: SummaryChoice) =>
    update((s) => ({
      ...s,
      settings: {
        ...s.settings,
        notify: { ...s.settings.notify, summary: summary === "off" ? undefined : summary },
      },
    }));

  // Subscribes or unsubscribes this browser
  const toggle = async (on: boolean) => {
    if (busy || status === "loading") return;
    setBusy(true);
    setNote(null);
    if (!on) {
      await unsubscribe();
      setStatus("off");
    } else if (key) {
      const result = await subscribe(key);
      if (result === "failed") setNote({ ok: false, text: t("settings.push.failed") });
      else setStatus(result);
    }
    setBusy(false);
  };

  // Asks for a test notification
  const test = async () => {
    setBusy(true);
    setNote(null);
    const result = await sendTest();
    if (result === "sent") setNote({ ok: true, text: t("settings.push.testSent") });
    else setNote({ ok: false, text: result === "wait" ? t("settings.push.wait") : t("settings.push.failed") });
    setBusy(false);
  };

  const blocked: Partial<Record<PushStatus, string>> = {
    unsupported: t("settings.push.unsupported"),
    ios: t("settings.push.ios"),
    dev: t("settings.push.dev"),
    server: t("settings.push.server"),
    denied: t("settings.push.denied"),
  };
  const reason = blocked[status];
  let standing = t("settings.push.off");
  if (status === "loading") standing = t("common.loading");
  else if (status === "on") standing = t("settings.push.on");

  return (
    <Card id="notifications" title={t("settings.push.title")} subtitle={t("settings.push.subtitle")} icon="bell">
      <div className={styles.body}>
        <p className={styles.hint}>{t("settings.push.hint", { hour: String(hour) })}</p>
        {reason ? (
          <p className={styles.reason}>{reason}</p>
        ) : (
          <SwitchRow
            className={styles.line}
            title={t("settings.push.switch")}
            hint={standing}
            checked={status === "on"}
            onChange={(on) => void toggle(on)}
          />
        )}
        {status === "on" && (
          <>
            {KINDS.map((kind) => (
              <SwitchRow
                key={kind}
                className={styles.line}
                title={t(`settings.push.${kind}`)}
                hint={t(`settings.push.${kind}.hint`)}
                checked={notify[kind] !== false}
                onChange={(on) => setKind(kind, on)}
              />
            ))}
            <FieldSet label={t("settings.push.summary")} hint={t("settings.push.summary.hint")}>
              <SegmentedControl<SummaryChoice>
                label={t("settings.push.summary")}
                options={SUMMARIES.map((value) => ({ value, label: t(`settings.push.summary.${value}`) }))}
                value={notify.summary ?? "off"}
                onChange={setSummary}
              />
            </FieldSet>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void test()}>
              {t("settings.push.test")}
            </Button>
          </>
        )}
        {note && <p className={cx(styles.note, note.ok ? styles.ok : styles.failed)}>{note.text}</p>}
      </div>
    </Card>
  );
};

export default NotificationsCard;
