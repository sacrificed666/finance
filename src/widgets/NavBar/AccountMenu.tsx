"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { clearOutbox } from "@/features/data/model/outbox";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { PROFILE, SETTINGS } from "@/shared/lib/navigation";
import Icon from "@/shared/ui/Icon/Icon";
import ToneMark from "@/shared/ui/ToneMark/ToneMark";

import styles from "./NavBar.module.scss";

// The account's disc, opening the profile, the settings and signing out
const AccountMenu = () => {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const here = pathname === PROFILE.href || pathname === SETTINGS.href;

  // Closes on a press outside the menu or on Escape
  useEffect(() => {
    if (!open) return;
    // Closes unless the press landed inside
    const onPress = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !root.current?.contains(event.target)) setOpen(false);
    };
    // Closes on Escape
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPress);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPress);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={styles.account}>
      <button
        type="button"
        aria-label={t("nav.account")}
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className={cx(styles.accountButton, here && styles.accountHere)}
      >
        <ToneMark icon={PROFILE.icon} tone={PROFILE.tone} className={styles.mark} />
      </button>
      {open && (
        <div className={styles.menu}>
          {[PROFILE, SETTINGS].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={styles.menuRow}
            >
              <ToneMark icon={item.icon} tone={item.tone} />
              <span>{t(item.label)}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void clearOutbox().then(() => signOut({ redirectTo: "/login" }))}
            className={styles.menuRow}
          >
            <span aria-hidden className={styles.plainMark}>
              <Icon name="logout" size={16} />
            </span>
            <span>{t("nav.signOut")}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
