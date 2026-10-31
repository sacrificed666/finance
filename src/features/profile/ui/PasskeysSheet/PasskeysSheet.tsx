"use client";

import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { useEffect, useState } from "react";

import {
  fetchPasskeys,
  registrationOptions,
  removePasskey,
  savePasskey,
  type Passkey,
} from "@/features/profile/api/passkeys";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDate } from "@/shared/lib/date";
import Button from "@/shared/ui/Button/Button";
import Icon from "@/shared/ui/Icon/Icon";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import Sheet from "@/shared/ui/Sheet/Sheet";
import SkeletonRows from "@/shared/ui/Skeleton/SkeletonRows";

import styles from "./PasskeysSheet.module.scss";

interface PasskeysSheetProps {
  onCount: (count: number) => void;
  onClose: () => void;
}

type PasskeyProblem = "profile.passkeys.cancelled" | "profile.passkeys.exists" | "profile.passkeys.failed";

// Why adding a passkey failed, from the browser's error
const problemOf = (error: unknown): PasskeyProblem => {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError") return "profile.passkeys.cancelled";
  return name === "InvalidStateError" ? "profile.passkeys.exists" : "profile.passkeys.failed";
};

// Registers a new passkey in the browser and keeps it, or says why not
const addPasskey = async (): Promise<Passkey[] | PasskeyProblem> => {
  const options = await registrationOptions();
  if (!options) return "profile.passkeys.failed";
  try {
    const saved = await savePasskey(await startRegistration({ optionsJSON: options }));
    return saved ?? "profile.passkeys.failed";
  } catch (error) {
    return problemOf(error);
  }
};

// Lists the account's passkeys, adds new ones and removes old ones
const PasskeysSheet = ({ onCount, onClose }: PasskeysSheetProps) => {
  const { t } = useI18n();
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<PasskeyProblem | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && browserSupportsWebAuthn();

  // Loads the passkeys once, unless the sheet closes first
  useEffect(() => {
    let alive = true;
    void fetchPasskeys().then((list) => {
      if (alive) setPasskeys(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Shows the new list and tells the profile how many there are
  const apply = (list: Passkey[]) => {
    setPasskeys(list);
    onCount(list.length);
  };

  // Adds a passkey through the browser
  const add = async () => {
    setBusy(true);
    setProblem(null);
    const result = await addPasskey();
    if (typeof result === "string") setProblem(result);
    else apply(result);
    setBusy(false);
  };

  // Removes a passkey once confirmed
  const remove = async (id: string) => {
    setBusy(true);
    setProblem(null);
    const list = await removePasskey(id);
    if (list) apply(list);
    else setProblem("profile.passkeys.failed");
    setRemoving(null);
    setBusy(false);
  };

  // The list, rows in outline while loading, or a note that there are none
  const content = () => {
    if (passkeys === null) {
      return (
        <output className={styles.loading} aria-label={t("common.loading")} aria-busy="true">
          <SkeletonRows count={2} />
        </output>
      );
    }
    if (passkeys.length === 0) return <p className={styles.empty}>{t("profile.passkeys.empty")}</p>;
    return (
      <ul className={styles.rows}>
        {passkeys.map((passkey) => (
          <li key={passkey.id} className={styles.row}>
            <IconDisc colorSlot={5} size="lg">
              <Icon name="key" size={17} />
            </IconDisc>
            <span className={styles.text}>
              <span className={styles.name}>{passkey.name || t("profile.signins.unknown")}</span>
              <span className={styles.dates}>
                {t("profile.passkeys.added", { date: formatDate(passkey.createdAt.slice(0, 10)) })} ·{" "}
                {passkey.lastUsedAt
                  ? t("profile.passkeys.used", { date: formatDate(passkey.lastUsedAt.slice(0, 10)) })
                  : t("profile.passkeys.never")}
              </span>
            </span>
            {removing === passkey.id ? (
              <Button variant="danger" size="sm" disabled={busy} onClick={() => void remove(passkey.id)}>
                {t("profile.passkeys.removeConfirm")}
              </Button>
            ) : (
              <button
                type="button"
                aria-label={t("profile.passkeys.remove", { name: passkey.name })}
                onClick={() => setRemoving(passkey.id)}
                className={styles.remove}
              >
                <Icon name="trash" size={15} />
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={t("profile.passkeys.title")}
      problem={problem && t(problem)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("dash.layout.done")}
          </Button>
          {supported && (
            <Button onClick={() => void add()} disabled={busy}>
              <Icon name="plus" size={15} />
              {t("profile.passkeys.add")}
            </Button>
          )}
        </>
      }
    >
      <p className={styles.hint}>{t("profile.passkeys.hint")}</p>
      {!supported && <p className={styles.unsupported}>{t("profile.passkeys.unsupported")}</p>}
      {content()}
    </Sheet>
  );
};

export default PasskeysSheet;
