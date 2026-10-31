import { averageKept } from "@/features/data/model/finmath";
import type { AppState, PlannedEvent, WishItem, WishPriority } from "@/features/data/model/types";
import { addMonths } from "@/shared/lib/date";
import { convert, parseAmount, type Currency } from "@/shared/lib/money";

// The order of the priorities, the most wanted first
const ORDER: Record<WishPriority, number> = { high: 0, normal: 1, low: 2 };

export const WISH_PRIORITIES: readonly WishPriority[] = ["high", "normal", "low"];

// The emoji a wish can have
export const WISH_ICONS = ["🎁", "💻", "📱", "🎮", "🚗", "✈️", "🏠", "🛋️", "📷", "⌚", "🎧", "🚲"];

// The colour of each priority, none for the low one
export const WISH_SLOT: Record<WishPriority, number | undefined> = { high: 9, normal: 4, low: undefined };

export interface WishlistPlan {
  pace: number;
  items: WishItem[];
  total: number;
  affordable: ReadonlyMap<string, string>;
}

// The wishes by priority and price, their total, and when each is affordable
export const wishlistPlan = (state: AppState, month: string): WishlistPlan => {
  const { baseCurrency, rates } = state.settings;
  const pace = Math.max(0, averageKept(state, month));
  const items = state.wishlist.toSorted((a, b) => ORDER[a.priority] - ORDER[b.priority] || a.price - b.price);
  const affordable = new Map<string, string>();
  let running = 0;
  for (const wish of items) {
    running += convert(wish.price, wish.currency, baseCurrency, rates);
    if (pace > 0) affordable.set(wish.id, addMonths(month, Math.max(0, Math.ceil(running / pace) - 1)));
  }
  return { pace, items, total: running, affordable };
};

// The wishes with a month, as sums the forecast takes out then
export const wishEvents = (wishlist: readonly WishItem[]): PlannedEvent[] =>
  wishlist.flatMap((wish) =>
    wish.month
      ? [
          {
            id: `wish:${wish.id}`,
            month: wish.month,
            amount: -wish.price,
            currency: wish.currency,
            note: `${wish.icon} ${wish.name}`,
          },
        ]
      : [],
  );

export interface WishForm {
  name: string;
  icon: string;
  price: string;
  currency: Currency;
  priority: WishPriority;
  url: string;
  month: string;
  note: string;
}

// The form of a new wish, or of a stored one
export const initialWishForm = (target: WishItem | "new"): WishForm =>
  target === "new"
    ? { name: "", icon: "🎁", price: "", currency: "UAH", priority: "normal", url: "", month: "", note: "" }
    : {
        name: target.name,
        icon: target.icon,
        price: String(target.price),
        currency: target.currency,
        priority: target.priority,
        url: target.url ?? "",
        month: target.month ?? "",
        note: target.note ?? "",
      };

export type WishProblem = "wish.problem.name" | "wish.problem.price" | "wish.problem.url";

// What stops the wish from being saved, the first problem only, or null
export const wishProblem = (form: WishForm): WishProblem | null => {
  const price = parseAmount(form.price);
  if (!form.name.trim()) return "wish.problem.name";
  if (!Number.isFinite(price) || price <= 0) return "wish.problem.price";
  if (form.url && !/^https:\/\/\S{3,}$/u.test(form.url)) return "wish.problem.url";
  return null;
};

// The wishlist with the form's wish changed in place or added
export const saveWish = (
  state: AppState,
  form: WishForm,
  target: WishItem | "new",
  makeId: () => string,
  today: string,
): AppState => {
  const fields = {
    name: form.name.trim(),
    icon: form.icon,
    price: parseAmount(form.price),
    currency: form.currency,
    priority: form.priority,
    url: form.url.trim() || undefined,
    month: form.month || undefined,
    note: form.note.trim() || undefined,
  };
  return {
    ...state,
    wishlist:
      target === "new"
        ? [...state.wishlist, { id: makeId(), createdAt: today, ...fields }]
        : state.wishlist.map((wish) => (wish.id === target.id ? { ...wish, ...fields } : wish)),
  };
};

// The wishlist without a wish
export const deleteWish = (state: AppState, id: string): AppState => ({
  ...state,
  wishlist: state.wishlist.filter((wish) => wish.id !== id),
});
