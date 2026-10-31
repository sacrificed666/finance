"use client";

import { useEffect, useEffectEvent, useState } from "react";

import { beginTwoFactor, sendTwoFactor } from "@/features/profile/api/twoFactor";
import { useI18n } from "@/shared/i18n/useI18n";
import { downloadFile } from "@/shared/lib/download";
import Button from "@/shared/ui/Button/Button";
import Field from "@/shared/ui/Field/Field";
import Sheet from "@/shared/ui/Sheet/Sheet";
import SkeletonBody from "@/shared/ui/Skeleton/SkeletonBody";
import TextInput from "@/shared/ui/TextInput/TextInput";

import QrCode from "./QrCode";

import styles from "./TwoFactorSheet.module.scss";

// The side of the QR code in pixels, which its outline keeps while the key is made
const QR_SIZE = 176;

type Step =
  | { kind: "loading" }
  | { kind: "scan"; secret: string; uri: string }
  | { kind: "codes"; codes: string[] }
  | { kind: "off" };

type TwoFactorProblem = "profile.twofa.failed" | "profile.twofa.wait" | "profile.twofa.wrong";

interface TwoFactorSheetProps {
  mode: "enable" | "disable";
  email: string | null;
  onDone: (enabled: boolean, recoveryLeft: number) => void;
  onClose: () => void;
}

// A secret in groups of four, easier to type by hand
const grouped = (secret: string) => secret.replaceAll(/(.{4})/gu, "$1 ").trim();

// Turns two-factor sign-in on with an authenticator app, or off with a code
const TwoFactorSheet = ({ mode, email, onDone, onClose }: TwoFactorSheetProps) => {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>(mode === "enable" ? { kind: "loading" } : { kind: "off" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<TwoFactorProblem | null>(null);
  const [copied, setCopied] = useState(false);
  const typed = code.replaceAll(/\s/gu, "");

  // Starts the setup once the sheet opens, unless it closes first
  const begin = useEffectEvent(() => {
    let alive = true;
    void beginTwoFactor().then((setup) => {
      if (!alive) return;
      if (setup) setStep({ kind: "scan", ...setup });
      else setProblem("profile.twofa.failed");
    });
    return () => {
      alive = false;
    };
  });

  useEffect(() => {
    if (mode !== "enable") return;
    return begin();
  }, [mode]);

  // Confirms the code from the app, or turns two-factor off with a code
  const send = async (action: "confirm" | "disable") => {
    setBusy(true);
    setProblem(null);
    const answer = await sendTwoFactor(action, code);
    setBusy(false);
    if (!answer.ok) {
      setProblem(`profile.twofa.${answer.reason}`);
      return;
    }
    if (action === "confirm") {
      setStep({ kind: "codes", codes: answer.recovery });
      onDone(true, answer.recovery.length);
    } else {
      onDone(false, 0);
      onClose();
    }
  };

  // The recovery codes as a text to keep
  const codesText = (codes: string[]) => [t("profile.twofa.recoveryTitle"), email ?? "", "", ...codes, ""].join("\n");
  // Copies the recovery codes
  const copy = async (codes: string[]) => {
    await navigator.clipboard.writeText(codesText(codes)).catch(() => null);
    setCopied(true);
  };

  let title = t("profile.twofa.setupTitle");
  if (mode === "disable") title = t("profile.twofa.disableTitle");
  else if (step.kind === "codes") title = t("profile.twofa.recoveryTitle");
  let submit: (() => void) | undefined;
  if (step.kind === "scan") submit = () => void send("confirm");
  else if (step.kind === "off") submit = () => void send("disable");
  const codeReady = step.kind === "scan" ? /^\d{6}$/u.test(typed) : typed.length >= 6;

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      onSubmit={submit}
      problem={problem && t(problem)}
      footer={
        step.kind === "codes" ? (
          <Button onClick={onClose}>{t("profile.twofa.saved")}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant={mode === "disable" ? "danger" : "primary"}
              disabled={busy || step.kind === "loading" || !codeReady}
            >
              {mode === "disable" ? t("profile.twofa.disable") : t("profile.twofa.enable")}
            </Button>
          </>
        )
      }
    >
      {step.kind === "scan" && (
        <>
          <p className={styles.text}>{t("profile.twofa.scan")}</p>
          <div className={styles.center}>
            <QrCode value={step.uri} label={t("profile.twofa.qr")} size={QR_SIZE} />
          </div>
          <Field label={t("profile.twofa.key")}>
            <p className={styles.secret}>{grouped(step.secret)}</p>
          </Field>
          <Field label={t("profile.twofa.code")}>
            <TextInput
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123 456"
              maxLength={7}
            />
          </Field>
        </>
      )}
      {step.kind === "loading" && (
        <output className={styles.loading} aria-label={t("common.loading")} aria-busy="true">
          <SkeletonBody shape={{ kind: "block", height: QR_SIZE, width: QR_SIZE }} />
          <SkeletonBody shape={{ kind: "fields", count: 2 }} />
        </output>
      )}
      {step.kind === "codes" && (
        <>
          <p className={styles.text}>{t("profile.twofa.recoveryHint")}</p>
          <ul className={styles.codes}>
            {step.codes.map((recovery) => (
              <li key={recovery} className={styles.code}>
                {recovery}
              </li>
            ))}
          </ul>
          <div className={styles.buttons}>
            <Button variant="ghost" size="sm" onClick={() => void copy(step.codes)}>
              {copied ? t("profile.twofa.copied") : t("profile.twofa.copy")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                downloadFile("finances-recovery-codes.txt", codesText(step.codes), "text/plain;charset=utf-8")
              }
            >
              {t("profile.twofa.download")}
            </Button>
          </div>
        </>
      )}
      {step.kind === "off" && (
        <>
          <p className={styles.text}>{t("profile.twofa.disableHint")}</p>
          <Field label={t("profile.twofa.codeOrRecovery")}>
            <TextInput
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              placeholder="123 456"
              maxLength={11}
            />
          </Field>
        </>
      )}
    </Sheet>
  );
};

export default TwoFactorSheet;
