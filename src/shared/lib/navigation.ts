import type { MessageKey } from "@/shared/i18n/messages/en";
import type { IconName } from "@/shared/ui/Icon/icons";

// The colour of each page, for its disc in the menus
export type PageTone =
  | "dashboard"
  | "calendar"
  | "reports"
  | "expenses"
  | "income"
  | "accounts"
  | "investments"
  | "forecast"
  | "profile"
  | "settings";

export interface NavItem {
  href: string;
  label: MessageKey;
  short: MessageKey;
  icon: IconName;
  tone: PageTone;
  tab?: boolean;
}

export interface NavGroup {
  title: MessageKey;
  items: NavItem[];
}

// The pages that work without a session
export const AUTH_PATHS: ReadonlySet<string> = new Set(["/login", "/register"]);

// The sign-in page that brings the visitor back to a page afterwards
export const signInHref = (next: string): string =>
  next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

// Pages in groups; the ones marked tab also sit in the phone's tab bar
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "nav.group.overview",
    items: [
      { href: "/", label: "nav.dashboard", short: "nav.dashboard.short", icon: "home", tone: "dashboard", tab: true },
      {
        href: "/calendar",
        label: "nav.calendar",
        short: "nav.calendar.short",
        icon: "calendar",
        tone: "calendar",
      },
      {
        href: "/reports",
        label: "nav.reports",
        short: "nav.reports.short",
        icon: "chart",
        tone: "reports",
      },
    ],
  },
  {
    title: "nav.group.money",
    items: [
      {
        href: "/transactions",
        label: "nav.expenses",
        short: "nav.expenses.short",
        icon: "spend",
        tone: "expenses",
        tab: true,
      },
      { href: "/income", label: "nav.income", short: "nav.income.short", icon: "arrowDown", tone: "income" },
    ],
  },
  {
    title: "nav.group.wealth",
    items: [
      {
        href: "/accounts",
        label: "nav.accounts",
        short: "nav.accounts.short",
        icon: "wallet",
        tone: "accounts",
        tab: true,
      },
      {
        href: "/investments",
        label: "nav.investments",
        short: "nav.investments.short",
        icon: "bars",
        tone: "investments",
      },
      { href: "/forecast", label: "nav.forecast", short: "nav.forecast.short", icon: "trend", tone: "forecast" },
    ],
  },
];

// Every page of the top bar
export const NAV: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

// The pages of the phone's bottom tab bar, beside its add button and More
export const TAB_BAR: NavItem[] = NAV.filter((item) => item.tab);

// The profile, in the account menu
export const PROFILE: NavItem = {
  href: "/profile",
  label: "nav.profile",
  short: "nav.profile.short",
  icon: "user",
  tone: "profile",
};

// The settings, under the groups
export const SETTINGS: NavItem = {
  href: "/settings",
  label: "nav.settings",
  short: "nav.settings.short",
  icon: "gear",
  tone: "settings",
};

// The menu entry of a page, for its colour
export const pageItem = (href: string): NavItem | undefined =>
  [...NAV, PROFILE, SETTINGS].find((item) => item.href === href);

// The pages behind More on phones: the rest of the top bar, then the account's own
export const MORE: NavItem[] = [...NAV.filter((item) => !item.tab), PROFILE, SETTINGS];

const PAGE_TONES = Object.fromEntries([...NAV, PROFILE, SETTINGS].map((item) => [item.href, item.tone]));

// Names the open page before the first paint, so its colour shows at once
export const PAGE_BOOT = `(function(T){var t=T[location.pathname];if(t)document.documentElement.dataset.page=t})(${JSON.stringify(PAGE_TONES)})`;
