"use client";

import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { registerAccount, signInWithGoogle, signInWithPasskey, signInWithPassword } from "@/features/auth/api/signIn";
import { passwordStrength } from "@/features/auth/model/passwordMeter";
import { emailValid, safeNext } from "@/features/auth/model/signInForm";
import PasswordField from "@/features/auth/ui/PasswordField/PasswordField";
import type { MessageKey } from "@/shared/i18n/messages/en";
import { useI18n } from "@/shared/i18n/useI18n";
import { pageItem } from "@/shared/lib/navigation";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import Field from "@/shared/ui/Field/Field";
import Icon from "@/shared/ui/Icon/Icon";
import Logo from "@/shared/ui/Logo/Logo";
import TextInput from "@/shared/ui/TextInput/TextInput";
import ToneMark from "@/shared/ui/ToneMark/ToneMark";

import LocaleSwitch from "./LocaleSwitch";

import styles from "./SignInPage.module.scss";

// What the app keeps, each beside the disc of its page
const FEATURES: readonly { href: string; text: MessageKey }[] = [
  { href: "/transactions", text: "auth.feature.expenses" },
  { href: "/income", text: "auth.feature.income" },
  { href: "/accounts", text: "auth.feature.accounts" },
  { href: "/forecast", text: "auth.feature.forecast" },
];

interface SignInPageProps {
  mode: "login" | "register";
  googleEnabled: boolean;
}

// Nothing to undo: passkey support does not change while the page is open
const unsubscribe = () => null;

// Nothing to subscribe to
const noSubscription = () => unsubscribe;

// Signs in or creates an account by email and password, a passkey or Google
const SignInPage = ({ mode, googleEnabled }: SignInPageProps) => {
  const { t, tk } = useI18n();
  const register = mode === "register";
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passkeys = useSyncExternalStore(noSubscription, browserSupportsWebAuthn, () => false) && !register;
  // Sending waits for the page to come alive, so an early click never reloads it
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const emailOk = emailValid(email);
  const passwordOk = register ? passwordStrength(password).rules.length : password.length > 0;
  const emailProblem = touched && email.trim() !== "" && !emailOk ? t("auth.error.email") : undefined;
  const codeBox = useRef<HTMLDivElement>(null);

  // Moves to the code field once the account asks for a code
  useEffect(() => {
    if (needCode) codeBox.current?.querySelector("input")?.focus();
  }, [needCode]);

  // Goes on to the page that was asked for
  const enter = () => {
    router.push(next);
    router.refresh();
  };

  // Creates the account when asked, then signs in with the password and code
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (register) {
        const refused = await registerAccount({ email, password, name });
        if (refused !== null) {
          setError(tk(refused, t("auth.error.create")));
          return;
        }
      }
      const result = await signInWithPassword(email, password, needCode ? code : "");
      if (result === "ok") enter();
      else if (result === "failed") setError(register ? t("auth.error.createdButFailed") : t("auth.error.wrong"));
      else {
        setNeedCode(true);
        if (result === "two_factor_wrong") setError(t("auth.code.wrong"));
      }
    } catch {
      setError(t("auth.error.network"));
    } finally {
      setBusy(false);
    }
  };

  // Signs in with a passkey; cancelling it is not an error
  const passkey = async () => {
    setBusy(true);
    setError(null);
    const result = await signInWithPasskey();
    setBusy(false);
    if (result === "ok") enter();
    else if (result === "failed") setError(t("auth.passkey.failed"));
  };

  // Goes back from the code to the email and password
  const back = () => {
    setNeedCode(false);
    setCode("");
    setError(null);
  };

  let submitLabel = register ? t("auth.register.submit") : t("auth.login.submit");
  if (busy) submitLabel = t("auth.working");
  else if (needCode) submitLabel = t("auth.code.submit");

  return (
    <main className={styles.page}>
      <div className={styles.language}>
        <LocaleSwitch />
      </div>

      <section className={styles.story}>
        <div className={styles.brand}>
          <Logo size={52} className={styles.mark} />
          <div className={styles.names}>
            <h1 className={styles.title}>{t("app.name")}</h1>
            <p className={styles.subtitle}>{register ? t("auth.register.subtitle") : t("auth.login.subtitle")}</p>
          </div>
        </div>
        <p className={styles.headline}>{t("auth.hero.title")}</p>
        <ul className={styles.features}>
          {FEATURES.map(({ href, text }) => {
            const item = pageItem(href);
            if (!item) return null;
            return (
              <li key={href} className={styles.feature}>
                <ToneMark icon={item.icon} tone={item.tone} className={styles.featureMark} />
                <span>
                  <span className={styles.featureName}>{t(item.label)}</span>
                  <span className={styles.featureText}>{t(text)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className={styles.panel}>
        <Card glow>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              setTouched(true);
              if (emailOk && passwordOk && !busy && (!needCode || code.trim().length >= 6)) void submit();
            }}
          >
            {needCode ? (
              <>
                <p className={styles.hint}>{t("auth.code.hint")}</p>
                <div ref={codeBox}>
                  <Field label={t("auth.code.label")} hint={t("auth.code.recovery")}>
                    <TextInput
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123 456"
                      maxLength={11}
                    />
                  </Field>
                </div>
              </>
            ) : (
              <>
                {register && (
                  <Field label={t("common.name")} hint={t("common.optional")}>
                    <TextInput
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder={t("common.example", { value: t("profile.displayName.placeholder") })}
                      autoComplete="name"
                      maxLength={80}
                    />
                  </Field>
                )}
                <Field label={t("auth.email")} hint={emailProblem}>
                  <TextInput
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                  />
                </Field>
                <Field label={t("auth.password")} hint={register ? t("auth.password.hint") : undefined}>
                  <PasswordField
                    label={t("auth.password")}
                    value={password}
                    onChange={setPassword}
                    required
                    meter={register}
                    autoComplete={register ? "new-password" : "current-password"}
                    placeholder="••••••••••"
                  />
                </Field>
              </>
            )}

            {error && (
              <p className={styles.error} role="alert">
                <Icon name="warning" size={16} className={styles.errorIcon} />
                {error}
              </p>
            )}

            <Button type="submit" className={styles.wide} disabled={busy || !hydrated}>
              {submitLabel}
            </Button>
            {needCode && (
              <Button variant="ghost" className={styles.wide} disabled={busy} onClick={back}>
                {t("auth.code.back")}
              </Button>
            )}
          </form>

          {(googleEnabled || passkeys) && !needCode && (
            <>
              <div className={styles.or}>
                <span className={styles.rule} />
                <span className={styles.orText}>{t("auth.or")}</span>
                <span className={styles.rule} />
              </div>
              <div className={styles.others}>
                {passkeys && (
                  <Button variant="ghost" className={styles.wide} disabled={busy} onClick={() => void passkey()}>
                    <Icon name="key" size={16} />
                    {t("auth.passkey")}
                  </Button>
                )}
                {googleEnabled && (
                  <Button
                    variant="ghost"
                    className={styles.wide}
                    disabled={busy}
                    onClick={() => void signInWithGoogle(next)}
                  >
                    <Icon name="globe" size={16} />
                    {t("auth.google")}
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>

        <p className={styles.switch}>
          {register ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
          <Link href={register ? "/login" : "/register"} className={styles.link}>
            {register ? t("auth.login.submit") : t("auth.createOne")}
          </Link>
        </p>

        <p className={styles.privacy}>
          <Icon name="lock" size={13} />
          {t("auth.privacy")}
        </p>
      </div>
    </main>
  );
};

export default SignInPage;
