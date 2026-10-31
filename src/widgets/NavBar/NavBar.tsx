"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, ViewTransition, type RefObject } from "react";

import PaletteButton from "@/features/commands/ui/PaletteButton/PaletteButton";
import AmountsToggle from "@/features/settings/ui/AmountsToggle/AmountsToggle";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { NAV, type NavItem } from "@/shared/lib/navigation";
import Icon from "@/shared/ui/Icon/Icon";
import ToneMark from "@/shared/ui/ToneMark/ToneMark";
import Brand from "@/widgets/Brand/Brand";

import AccountMenu from "./AccountMenu";

import styles from "./NavBar.module.scss";

interface NavTabProps {
  item: NavItem;
  shortcut: number;
  active: boolean;
}

// A page as its disc and name; the open one sits on the pill that slides along
const NavTab = ({ item, shortcut, active }: NavTabProps) => {
  const { t } = useI18n();
  const label = t(item.label);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={`${label} · ${String(shortcut)}`}
      className={cx(styles.tab, active && styles.active)}
    >
      {active && (
        <ViewTransition name="nav-pill" share="pill-move" default="none">
          <span aria-hidden className={styles.pill} />
        </ViewTransition>
      )}
      <ToneMark icon={item.icon} tone={item.tone} className={styles.mark} />
      <span className={styles.label}>{label}</span>
    </Link>
  );
};

// Whether the pages' names fit in the bar's room, rechecked on resizes
const useNamesFit = (room: RefObject<HTMLElement | null>, row: RefObject<HTMLElement | null>) => {
  const [fit, setFit] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    const slot = room.current;
    const names = row.current;
    if (!slot || !names || typeof ResizeObserver === "undefined") return;
    // Lays the names out for a moment and compares them with the room
    const check = () => {
      const was = slot.dataset.names;
      slot.dataset.names = "shown";
      const fits = names.scrollWidth <= slot.clientWidth;
      if (was === undefined) delete slot.dataset.names;
      else slot.dataset.names = was;
      setFit(fits);
    };
    const observer = new ResizeObserver(check);
    observer.observe(slot);
    observer.observe(names);
    if ("fonts" in document) void document.fonts.ready.then(check);
    return () => observer.disconnect();
  }, [room, row]);
  return fit;
};

// The bar over the page from tablets up: brand, pages, search, adding, account
const NavBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const room = useRef<HTMLElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const fit = useNamesFit(room, row);
  let names: string | undefined;
  if (fit !== null) names = fit ? "shown" : "hidden";
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Brand className={styles.brand} />
        <nav ref={room} aria-label={t("nav.pages")} data-names={names} className={styles.tabs}>
          <div ref={row} className={styles.row}>
            {NAV.map((item, index) => (
              <NavTab key={item.href} item={item} shortcut={index + 1} active={pathname === item.href} />
            ))}
          </div>
        </nav>
        <div className={styles.tools}>
          <PaletteButton className={styles.palette} />
          <AmountsToggle />
          <button
            type="button"
            aria-label={t("nav.newEntry")}
            title={`${t("nav.newEntry")} · N`}
            onClick={() => router.push(`${pathname}?add=expense`, { scroll: false })}
            className={styles.add}
          >
            <Icon name="plus" size={18} strokeWidth={2.6} />
            <span aria-hidden className={styles.addLabel}>
              {t("nav.newEntry")}
            </span>
          </button>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
};

export default NavBar;
