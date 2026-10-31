import type { AppState, Category } from "@/features/data/model/types";
import { DEFAULT_TAX_PROFILE } from "@/features/income/model/tax";

// A category, with a parent when it has one
const cat = (
  id: string,
  name: string,
  icon: string,
  colorSlot: number,
  kind: Category["kind"],
  parentId?: string,
): Category => (parentId ? { id, name, icon, colorSlot, kind, parentId } : { id, name, icon, colorSlot, kind });

export const DEFAULT_CATEGORIES: Category[] = [
  cat("cat-housing", "Housing", "🏠", 1, "expense"),
  cat("cat-rent", "Rent", "🔑", 1, "expense", "cat-housing"),
  cat("cat-utilities", "Utilities", "💡", 1, "expense", "cat-housing"),
  cat("cat-internet", "Internet & Phone", "📶", 1, "expense", "cat-housing"),
  cat("cat-household", "Household", "🧴", 1, "expense", "cat-housing"),
  cat("cat-repairs", "Repairs", "🛠️", 1, "expense", "cat-housing"),

  cat("cat-food", "Food", "🍽️", 3, "expense"),
  cat("cat-groceries", "Groceries", "🛒", 3, "expense", "cat-food"),
  cat("cat-restaurants", "Restaurants & Cafés", "🍝", 3, "expense", "cat-food"),
  cat("cat-delivery", "Food Delivery", "🛵", 3, "expense", "cat-food"),
  cat("cat-coffee", "Coffee & Snacks", "☕", 3, "expense", "cat-food"),

  cat("cat-transport", "Transport", "🚗", 2, "expense"),
  cat("cat-fuel", "Fuel", "⛽", 2, "expense", "cat-transport"),
  cat("cat-public-transport", "Public Transport", "🚇", 2, "expense", "cat-transport"),
  cat("cat-taxi", "Taxi", "🚕", 2, "expense", "cat-transport"),
  cat("cat-car", "Car Maintenance", "🔧", 2, "expense", "cat-transport"),
  cat("cat-parking", "Parking & Tolls", "🅿️", 2, "expense", "cat-transport"),

  cat("cat-health", "Health", "💊", 4, "expense"),
  cat("cat-pharmacy", "Pharmacy", "💉", 4, "expense", "cat-health"),
  cat("cat-doctors", "Doctors & Dentist", "🩺", 4, "expense", "cat-health"),
  cat("cat-fitness", "Sport & Fitness", "🏋️", 4, "expense", "cat-health"),
  cat("cat-insurance", "Insurance", "🛡️", 4, "expense", "cat-health"),

  cat("cat-shopping", "Shopping", "🛍️", 5, "expense"),
  cat("cat-clothes", "Clothes & Shoes", "👕", 5, "expense", "cat-shopping"),
  cat("cat-electronics", "Electronics", "💻", 5, "expense", "cat-shopping"),
  cat("cat-beauty", "Beauty & Care", "💄", 5, "expense", "cat-shopping"),

  cat("cat-wants", "Fun & Wants", "🎉", 6, "expense"),
  cat("cat-games", "Games", "🎮", 6, "expense", "cat-wants"),
  cat("cat-events", "Movies & Events", "🎬", 6, "expense", "cat-wants"),
  cat("cat-hobbies", "Hobbies", "🎨", 6, "expense", "cat-wants"),
  cat("cat-travel", "Travel", "✈️", 6, "expense", "cat-wants"),

  cat("cat-subs", "Subscriptions", "📱", 8, "expense"),

  cat("cat-education", "Education", "📚", 7, "expense"),
  cat("cat-courses", "Courses", "🎓", 7, "expense", "cat-education"),
  cat("cat-books", "Books", "📖", 7, "expense", "cat-education"),

  cat("cat-kids", "Kids", "🧸", 2, "expense"),
  cat("cat-pets", "Pets", "🐾", 3, "expense"),
  cat("cat-gifts-out", "Gifts", "🎁", 7, "expense"),

  cat("cat-charity", "Charity & Donations", "❤️", 4, "expense"),
  cat("cat-army", "Army Support", "🇺🇦", 4, "expense", "cat-charity"),

  cat("cat-taxes", "Taxes & Fees", "🧾", 5, "expense"),
  cat("cat-fees", "Bank Fees", "🏧", 5, "expense", "cat-taxes"),

  cat("cat-unexpected", "Unexpected", "⚡", 7, "expense"),
  cat("cat-other-exp", "Other", "📦", 3, "expense"),

  cat("cat-salary", "Salary", "💼", 2, "income"),
  cat("cat-freelance", "Freelance", "🧑‍💻", 1, "income"),
  cat("cat-business", "Business", "🏢", 6, "income"),
  cat("cat-interest", "Interest", "🏦", 5, "income"),
  cat("cat-dividends", "Dividends", "📈", 4, "income"),
  cat("cat-rental", "Rental Income", "🏘️", 1, "income"),
  cat("cat-cashback", "Cashback", "💸", 8, "income"),
  cat("cat-sale", "Sale", "🏷️", 8, "income"),
  cat("cat-refunds", "Refunds", "↩️", 3, "income"),
  cat("cat-gifts-in", "Gifts", "🎁", 7, "income"),
  cat("cat-other-inc", "Other", "💰", 3, "income"),
];

export const DEFAULT_CATEGORY_NAMES: ReadonlyMap<string, string> = new Map(
  DEFAULT_CATEGORIES.map((c) => [c.id, c.name]),
);

export const LEGACY_DEFAULT_NAMES: Record<string, string> = {
  "cat-clothes": "Clothes",
};

export const DEFAULT_RATES = { USD: 44.6, EUR: 50.8 };

export const DEFAULT_STATE: AppState = {
  version: 1,
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  recurring: [],
  subscriptions: [],
  savings: [],
  investments: [],
  budgets: [],
  debts: [],
  rules: [],
  receivables: [],
  wishlist: [],
  plannedEvents: [],
  snapshots: [],
  goals: [],
  settings: {
    baseCurrency: "UAH",
    theme: "system",
    locale: "en",
    tax: DEFAULT_TAX_PROFILE,
    rates: DEFAULT_RATES,
    ratesSource: "manual",
  },
};

export const ICON_CHOICES = [
  "💵",
  "🏦",
  "💳",
  "🐷",
  "🧧",
  "🏠",
  "🚗",
  "✈️",
  "🎓",
  "💍",
  "🛒",
  "🍽️",
  "💊",
  "🎬",
  "👕",
  "📱",
  "📚",
  "🎁",
  "📦",
  "💰",
  "🧑‍💻",
  "💼",
  "⚡",
  "🌊",
  "🛡️",
  "🎯",
  "🎮",
  "🎵",
  "☁️",
  "🤖",
  "☕",
  "⛽",
  "🚕",
  "🐾",
  "🧸",
  "❤️",
  "🧾",
  "💻",
  "💄",
  "🏋️",
  "🎨",
  "🔑",
  "📶",
  "🛠️",
  "🩺",
  "🏘️",
  "💸",
  "↩️",
  "🇺🇦",
  "🏛️",
];

// Adds missing default categories and links old ones to their default parents
export const mergeDefaultCategories = (
  categories: Category[],
): {
  categories: Category[];
  added: number;
  linked: number;
} => {
  const byId = new Map(categories.map((c) => [c.id, c]));
  let added = 0;
  let linked = 0;
  const next = categories.map((c) => {
    const def = DEFAULT_CATEGORIES.find((d) => d.id === c.id);
    if (def?.parentId && !c.parentId && c.kind === def.kind) {
      linked++;
      return { ...c, parentId: def.parentId };
    }
    return c;
  });
  for (const def of DEFAULT_CATEGORIES) {
    if (byId.has(def.id)) continue;
    next.push(def);
    added++;
  }
  return { categories: next, added, linked };
};
