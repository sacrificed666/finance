"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, ViewTransition } from "react";

import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { MORE, TAB_BAR, type NavItem } from "@/shared/lib/navigation";
import Icon from "@/shared/ui/Icon/Icon";

import MoreSheet from "./MoreSheet";

import styles from "./TabBar.module.scss";

// The phone's tab bar: two pages, a round add button, a third page and More
const TabBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [more, setMore] = useState(false);
  const inMore = MORE.some((item) => item.href === pathname);
  // One page's tab, on a soft pill while open
  const tab = (item: NavItem) => {
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cx(styles.tab, active && styles.active)}
      >
        {active && (
          <ViewTransition name="tab-pill" share="pill-move" default="none">
            <span aria-hidden className={styles.pill} />
          </ViewTransition>
        )}
        <Icon name={item.icon} size={20} strokeWidth={active ? 2.2 : 1.8} className={styles.icon} />
        <span className={styles.label}>{t(item.short)}</span>
      </Link>
    );
  };
  const [first, second, third] = TAB_BAR;

  return (
    <>
      <nav className={styles.bar}>
        {first && tab(first)}
        {second && tab(second)}
        <button
          type="button"
          aria-label={t("dash.addExpense")}
          onClick={() => router.push(`${pathname}?add=expense`, { scroll: false })}
          className={styles.add}
        >
          <Icon name="plus" size={24} strokeWidth={2.6} />
        </button>
        {third && tab(third)}
        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore(true)}
          className={cx(styles.tab, inMore && styles.active)}
        >
          {inMore && <span aria-hidden className={styles.pill} />}
          <Icon name="grid" size={20} strokeWidth={inMore ? 2.2 : 1.8} className={styles.icon} />
          <span className={styles.label}>{t("nav.more")}</span>
        </button>
      </nav>
      {more && <MoreSheet onClose={() => setMore(false)} />}
    </>
  );
};

export default TabBar;
