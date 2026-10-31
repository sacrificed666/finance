"use client";

import { useState, type ReactNode } from "react";

import { endAllSessions } from "@/features/profile/api/profile";
import { leave, linkGoogle } from "@/features/profile/api/session";
import type { Profile } from "@/features/profile/model/profileFields";
import PasskeysSheet from "@/features/profile/ui/PasskeysSheet/PasskeysSheet";
import TwoFactorSheet from "@/features/profile/ui/TwoFactorSheet/TwoFactorSheet";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import Badge from "@/shared/ui/Badge/Badge";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import ConfirmDialog from "@/shared/ui/ConfirmDialog/ConfirmDialog";
import Icon from "@/shared/ui/Icon/Icon";
import type { IconName } from "@/shared/ui/Icon/icons";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";

import PasswordForm from "./PasswordForm";

import styles from "./SignInCard.module.scss";

interface SignInMethodRow {
  id: string;
  icon: IconName;
  slot: number;
  title: string;
  status: string;
  on: boolean;
  action?: ReactNode;
}

interface SignInCardProps {
  profile: Profile;
  onChange: (patch: Partial<Profile>) => void;
}

// How the account signs in: password, Google, passkeys, two-factor and sessions
const SignInCard = ({ profile, onChange }: SignInCardProps) => {
  const { t, tp } = useI18n();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [twoFactor, setTwoFactor] = useState<"enable" | "disable" | null>(null);
  const [endAll, setEndAll] = useState(false);
  const [passkeys, setPasskeys] = useState(false);
  const google = profile.providers.includes("google");

  // Ends every session, then this one
  const signOutEverywhere = async () => {
    setMessage(null);
    if (await endAllSessions()) await leave();
    else setMessage({ ok: false, text: t("profile.sessions.failed") });
  };

  // Google among the ways in, where it is linked or this server can link it
  const googleRow: SignInMethodRow[] =
    google || profile.googleAvailable
      ? [
          {
            id: "google",
            icon: "globe",
            slot: 4,
            title: "Google",
            status: google ? t("profile.google.linked") : t("profile.google.notLinked"),
            on: google,
            action: google ? undefined : (
              <Button variant="ghost" size="sm" onClick={() => void linkGoogle()}>
                {t("profile.google.link")}
              </Button>
            ),
          },
        ]
      : [];

  const methods: SignInMethodRow[] = [
    {
      id: "password",
      icon: "lock",
      slot: 10,
      title: t("profile.signin.password"),
      status: [
        profile.hasPassword ? t("profile.password.set") : t("profile.password.notSet"),
        profile.emailVerified && t("profile.email.verified"),
      ]
        .filter(Boolean)
        .join(" · "),
      on: profile.hasPassword,
    },
    ...googleRow,
    {
      id: "passkeys",
      icon: "key",
      slot: 5,
      title: t("profile.passkeys.title"),
      status: profile.passkeys > 0 ? tp("profile.passkeys.count", profile.passkeys) : t("profile.passkeys.none"),
      on: profile.passkeys > 0,
      action: (
        <Button variant="ghost" size="sm" onClick={() => setPasskeys(true)}>
          {profile.passkeys > 0 ? t("profile.passkeys.manage") : t("profile.passkeys.add")}
        </Button>
      ),
    },
  ];
  if (profile.hasPassword) {
    methods.push({
      id: "two-factor",
      icon: "device",
      slot: 7,
      title: t("profile.twofa.title"),
      status: profile.twoFactor ? tp("profile.twofa.on", profile.recoveryLeft) : t("profile.twofa.off"),
      on: profile.twoFactor,
      action: (
        <Button variant="ghost" size="sm" onClick={() => setTwoFactor(profile.twoFactor ? "disable" : "enable")}>
          {profile.twoFactor ? t("profile.twofa.turnOff") : t("profile.twofa.turnOn")}
        </Button>
      ),
    });
  }

  return (
    <Card title={t("profile.signin")} subtitle={t("profile.signin.subtitle")} icon="shield">
      <ul className={styles.methods}>
        {methods.map((method) => (
          <li key={method.id} className={styles.method}>
            <IconDisc colorSlot={method.slot} size="lg">
              <Icon name={method.icon} size={17} />
            </IconDisc>
            <span className={styles.methodText}>
              <span className={styles.methodTitle}>{method.title}</span>
              <span className={styles.status}>{method.status}</span>
            </span>
            {method.action ?? (
              <Badge tone={method.on ? "income" : "neutral"}>
                {method.on ? t("profile.signin.active") : t("profile.signin.off")}
              </Badge>
            )}
          </li>
        ))}
      </ul>

      {message && <p className={cx(styles.message, message.ok ? styles.ok : styles.failed)}>{message.text}</p>}

      {editing ? (
        <PasswordForm
          hasPassword={profile.hasPassword}
          onDone={() => {
            setMessage({ ok: true, text: t("profile.password.updated") });
            setEditing(false);
            onChange({ hasPassword: true });
          }}
          onFailed={(text) => setMessage({ ok: false, text })}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className={styles.actions}>
          <Button
            variant="ghost"
            onClick={() => {
              setMessage(null);
              setEditing(true);
            }}
          >
            <Icon name="lock" size={15} />
            {profile.hasPassword ? t("profile.password.change") : t("profile.password.setButton")}
          </Button>
          <Button variant="ghost" onClick={() => setEndAll(true)}>
            <Icon name="monitor" size={15} />
            {t("profile.sessions.endAll")}
          </Button>
          <Button variant="danger" onClick={() => void leave()}>
            <Icon name="logout" size={15} />
            {t("nav.signOut")}
          </Button>
        </div>
      )}

      {passkeys && (
        <PasskeysSheet onCount={(count) => onChange({ passkeys: count })} onClose={() => setPasskeys(false)} />
      )}
      {twoFactor && (
        <TwoFactorSheet
          mode={twoFactor}
          email={profile.email}
          onDone={(enabled, recoveryLeft) => onChange({ twoFactor: enabled, recoveryLeft })}
          onClose={() => setTwoFactor(null)}
        />
      )}
      <ConfirmDialog
        open={endAll}
        onClose={() => setEndAll(false)}
        onConfirm={() => void signOutEverywhere()}
        title={t("profile.sessions.confirmTitle")}
        message={t("profile.sessions.confirm")}
        confirmLabel={t("profile.sessions.endAll")}
      />
    </Card>
  );
};

export default SignInCard;
