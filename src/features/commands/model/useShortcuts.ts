"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { setHiddenAmounts, useHiddenAmounts } from "@/features/settings/model/hiddenAmounts";
import { readStored } from "@/shared/hooks/usePersistentState";
import { NAV } from "@/shared/lib/navigation";

import { openCommandPalette } from "./palette";

// The device's choice of single-key shortcuts, on unless turned off in Settings
export const SHORTCUTS_KEY = "shortcuts";

// Whether a key press belongs to something being typed or to an open dialog
const busy = (event: KeyboardEvent) => {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const typing = target?.isContentEditable === true || /^(INPUT|TEXTAREA|SELECT)$/u.test(target?.tagName ?? "");
  return typing || document.querySelector("dialog[open]") !== null;
};

// Plain keys outside fields: N, I, H amounts, / search, 1 to 8 a page
export const useShortcuts = () => {
  const router = useRouter();
  const pathname = usePathname();
  const hidden = useHiddenAmounts();
  // Listens on the document for as long as the shell is shown
  useEffect(() => {
    // Acts on a plain key press, leaving any with a modifier alone
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || busy(event)) {
        return;
      }
      if (!readStored<boolean>(SHORTCUTS_KEY, true)) return;
      const key = event.key.toLowerCase();
      const page = /^[1-8]$/u.test(key) ? NAV[Number(key) - 1] : undefined;
      if (key === "n") router.push(`${pathname}?add=expense`, { scroll: false });
      else if (key === "i") router.push(`${pathname}?add=income`, { scroll: false });
      else if (key === "h") setHiddenAmounts(!hidden);
      else if (key === "/") openCommandPalette();
      else if (page) router.push(page.href);
      else return;
      event.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, pathname, hidden]);
};
