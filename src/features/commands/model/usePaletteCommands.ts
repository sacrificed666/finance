"use client";

import { usePathname, useRouter } from "next/navigation";

import { useStore } from "@/app/hooks";
import { activeAccounts } from "@/features/accounts/model/accounts";
import { accountBalances } from "@/features/data/model/finmath";
import type { Transaction } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { setHiddenAmounts, useHiddenAmounts } from "@/features/settings/model/hiddenAmounts";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDateShort, todayISO } from "@/shared/lib/date";
import { matchesQuery } from "@/shared/lib/listing";
import { NAV, PROFILE, SETTINGS } from "@/shared/lib/navigation";

import { type Command, COMMAND_GROUPS } from "./palette";

// At most this many entries match a search
const ENTRIES_SHOWN = 8;
// At most this many accounts and positions match a search
const MATCHES_SHOWN = 5;

// Past entries newest first, then planned ones soonest first
const byRecency =
  (today: string) =>
  (a: Transaction, b: Transaction): number => {
    const aPlanned = a.date > today;
    const bPlanned = b.date > today;
    if (aPlanned !== bPlanned) return aPlanned ? 1 : -1;
    return aPlanned ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
  };

// The tone of an entry's amount
const toneOf = (entry: Transaction): "income" | "expense" | "muted" => {
  if (entry.type === "income") return "income";
  if (entry.type === "expense") return "expense";
  return "muted";
};

// Commands matching a search; entries from two letters on
export const usePaletteCommands = (query: string, onClose: () => void): Command[] => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const category = useCategoryName();
  const router = useRouter();
  const pathname = usePathname();
  const hidden = useHiddenAmounts();
  const { settings } = state;

  // Closes the palette and opens a page
  const go = (href: string) => () => {
    onClose();
    router.push(href);
  };
  // Opens a sheet on the page that is open now
  const here = (param: string) => go(`${pathname}?${param}`);

  const dark =
    settings.theme === "dark" ||
    (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const commands: Command[] = [
    {
      id: "add-expense",
      group: "actions",
      label: t("dash.addExpense"),
      mark: { icon: "plus" },
      run: here("add=expense"),
    },
    {
      id: "add-income",
      group: "actions",
      label: t("palette.addIncome"),
      mark: { icon: "arrowDown" },
      run: here("add=income"),
    },
    ...(activeAccounts(state.savings).length >= 2
      ? [
          {
            id: "add-transfer",
            group: "actions" as const,
            label: t("palette.addTransfer"),
            mark: { icon: "exchange" as const },
            run: here("add=transfer"),
          },
        ]
      : []),
    {
      id: "theme",
      group: "actions",
      label: dark ? t("palette.themeLight") : t("palette.themeDark"),
      mark: { icon: dark ? "sun" : "moon" },
      run: () => {
        onClose();
        update((current) => ({ ...current, settings: { ...current.settings, theme: dark ? "light" : "dark" } }));
      },
    },
    {
      id: "amounts",
      group: "actions",
      label: hidden ? t("amounts.show") : t("amounts.hide"),
      mark: { icon: hidden ? "eye" : "eyeOff" },
      run: () => {
        onClose();
        setHiddenAmounts(!hidden);
      },
    },
    ...[...NAV, PROFILE, SETTINGS].map<Command>((item) => ({
      id: `page:${item.href}`,
      group: "pages",
      label: t(item.label),
      keywords: item.href,
      mark: { icon: item.icon, tone: item.tone },
      trailing: pathname === item.href ? { here: true } : undefined,
      run: go(item.href),
    })),
  ];

  const text = query.trim();
  // Accounts and positions join once something is typed
  if (text !== "") {
    const balances = accountBalances(state, todayISO());
    for (const account of state.savings) {
      commands.push({
        id: `account:${account.id}`,
        group: "accounts",
        label: account.name,
        hint: t(`accountKind.${account.kind}`),
        keywords: account.bank,
        mark: { emoji: account.icon },
        trailing: { amount: balances.get(account.id) ?? 0, currency: account.currency, tone: "muted" },
        run: go("/accounts"),
      });
    }
    for (const investment of state.investments) {
      commands.push({
        id: `investment:${investment.id}`,
        group: "investments",
        label: investment.name,
        hint: t(`investmentKind.${investment.kind}`),
        mark: { icon: "bars" },
        run: go("/investments"),
      });
    }
  }

  let visible = commands.filter((command) => matchesQuery(text, command.label, command.hint, command.keywords));
  // Only the first few accounts and positions stay
  for (const group of ["accounts", "investments"] as const) {
    const extra = new Set(visible.filter((command) => command.group === group).slice(MATCHES_SHOWN));
    visible = visible.filter((command) => !extra.has(command));
  }

  // Entries match by note, bank words, category, amount or tag from two letters on
  if (text.length >= 2) {
    const categoryById = new Map(state.categories.map((item) => [item.id, item]));
    const today = todayISO();
    const entries = state.transactions
      .filter((entry) => {
        const entryCategory = entry.categoryId ? categoryById.get(entry.categoryId) : undefined;
        return matchesQuery(
          text,
          entry.note,
          entry.bank?.text,
          entryCategory ? category(entryCategory) : undefined,
          String(entry.amount),
          ...(entry.tags ?? []).map((tag) => `#${tag}`),
        );
      })
      .toSorted(byRecency(today))
      .slice(0, ENTRIES_SHOWN);
    for (const entry of entries) {
      const entryCategory = entry.categoryId ? categoryById.get(entry.categoryId) : undefined;
      const trimmed = entry.note?.trim();
      const note = trimmed === "" ? undefined : trimmed;
      const transfer = entry.type === "transfer";
      visible.push({
        id: `tx:${entry.id}`,
        group: "entries",
        label: note ?? (transfer ? t("tx.type.transfer") : category(entryCategory)),
        hint: [
          formatDateShort(entry.date),
          note && entryCategory ? category(entryCategory) : null,
          entry.date > today ? t("palette.planned") : null,
        ]
          .filter(Boolean)
          .join(" · "),
        mark: {
          emoji: transfer ? "⇄" : (entryCategory?.icon ?? "❓"),
          colorSlot: transfer ? undefined : entryCategory?.colorSlot,
        },
        trailing: {
          amount: entry.type === "expense" ? -entry.amount : entry.amount,
          currency: entry.currency,
          sign: !transfer,
          tone: toneOf(entry),
          strong: true,
        },
        run: here(`tx=${entry.id}`),
      });
    }
  }

  return COMMAND_GROUPS.flatMap((group) => visible.filter((command) => command.group === group));
};
