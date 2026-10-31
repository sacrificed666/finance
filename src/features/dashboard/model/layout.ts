import type { DashboardCardId, DashboardLayout } from "@/features/data/model/types";
import type { MessageKey } from "@/shared/i18n/messages/en";
import { isRecord, readArray } from "@/shared/lib/guards";

// The cards in two columns of about the same height
export const DEFAULT_DASHBOARD: DashboardLayout = {
  main: ["start", "quickAdd", "cashFlow", "spending", "cashAhead"],
  side: ["comingUp", "recent", "holdings", "subscriptions", "progress"],
  hidden: [],
};

// The title each card goes by in the layout settings
export const CARD_TITLES: Record<DashboardCardId, MessageKey> = {
  start: "dash.start",
  quickAdd: "dash.quick",
  cashFlow: "tx.flow",
  spending: "dash.spending",
  cashAhead: "dash.layout.ahead",
  comingUp: "dash.coming",
  recent: "dash.recent",
  holdings: "dash.allocation",
  subscriptions: "tx.subs",
  progress: "dash.progress",
};

// Every card the dashboard knows
const KNOWN: ReadonlySet<string> = new Set([...DEFAULT_DASHBOARD.main, ...DEFAULT_DASHBOARD.side]);

// Whether a value names a card the dashboard knows
const isCard = (value: unknown): value is DashboardCardId => typeof value === "string" && KNOWN.has(value);

// A saved layout made whole: known cards once each, new cards in their column
export const dashboardLayout = (saved?: unknown): DashboardLayout => {
  const seen = new Set<DashboardCardId>();
  // The known cards of a saved column that no earlier column took
  const take = (list: readonly unknown[]) =>
    list.filter(isCard).filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  const main = take(readArray(saved, "main"));
  const side = take(readArray(saved, "side"));
  return {
    main: [...main, ...DEFAULT_DASHBOARD.main.filter((id) => !seen.has(id))],
    side: [...side, ...DEFAULT_DASHBOARD.side.filter((id) => !seen.has(id))],
    hidden: [...new Set(readArray(saved, "hidden").filter(isCard))],
  };
};

// Whether two columns hold the same cards in the same order
const sameColumn = (a: readonly DashboardCardId[], b: readonly DashboardCardId[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

// Whether a layout is the default one
export const isDefaultDashboard = (layout: DashboardLayout): boolean =>
  sameColumn(layout.main, DEFAULT_DASHBOARD.main) &&
  sameColumn(layout.side, DEFAULT_DASHBOARD.side) &&
  layout.hidden.length === 0;

// A layout worth storing, or nothing for the default one
export const normalizeDashboard = (value: unknown): DashboardLayout | undefined => {
  if (!isRecord(value)) return undefined;
  const layout = dashboardLayout(value);
  return isDefaultDashboard(layout) ? undefined : layout;
};

// The layout with a card moved one place up or down its column
export const moveCard = (layout: DashboardLayout, id: DashboardCardId, step: -1 | 1): DashboardLayout => {
  const inMain = layout.main.includes(id);
  const list = inMain ? layout.main : layout.side;
  const at = list.indexOf(id);
  const other = list[at + step];
  if (at < 0 || other === undefined) return layout;
  const moved = list.with(at, other).with(at + step, id);
  return inMain ? { ...layout, main: moved } : { ...layout, side: moved };
};

// The layout without some cards, for settings that should not offer them
export const withoutCards = (layout: DashboardLayout, ids: readonly DashboardCardId[]): DashboardLayout => ({
  main: layout.main.filter((id) => !ids.includes(id)),
  side: layout.side.filter((id) => !ids.includes(id)),
  hidden: layout.hidden.filter((id) => !ids.includes(id)),
});

// The layout with a card shown or hidden
export const showCard = (layout: DashboardLayout, id: DashboardCardId, shown: boolean): DashboardLayout => {
  const hidden = layout.hidden.filter((item) => item !== id);
  return { ...layout, hidden: shown ? hidden : [...hidden, id] };
};
