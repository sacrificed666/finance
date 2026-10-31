import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";

export const VISUAL_NOW = "2026-09-15T10:00:00+03:00";

const MONTHS = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
const FREELANCE = [8000, 0, 12000, 6000, 9500, 0];
const GROCERIES = [2140, 1875.5, 2390, 1760, 2215, 1980];
const EATING_OUT = [860, 1240, 690, 1420, 980, 540];

// Six months of salary, groceries, bills and a few one-off entries
function entries(): Transaction[] {
  const out: Transaction[] = [];
  // Adds an entry in hryvnias with the next id
  const add = (tx: Omit<Transaction, "id" | "currency"> & { currency?: Transaction["currency"] }) =>
    out.push({ currency: "UAH", ...tx, id: `v${out.length + 1}` });
  MONTHS.forEach((month, i) => {
    const current = month === "2026-09";
    add({
      type: "income",
      amount: 62000,
      categoryId: "cat-salary",
      date: `${month}-05`,
      accountId: "card",
      note: "Salary",
    });
    const freelance = FREELANCE[i] ?? 0;
    if (freelance)
      add({
        type: "income",
        amount: freelance,
        categoryId: "cat-freelance",
        date: `${month}-20`,
        accountId: "card",
        note: "Client project",
      });
    for (const [day, share] of [
      ["03", 0.35],
      ["11", 0.4],
      ["24", 0.25],
    ] as const) {
      if (current && day === "24") continue;
      add({
        type: "expense",
        amount: Math.round((GROCERIES[i] ?? 0) * share * 100) / 100,
        categoryId: "cat-groceries",
        date: `${month}-${day}`,
        accountId: "card",
        note: "Silpo",
      });
    }
    add({
      type: "expense",
      amount: EATING_OUT[i] ?? 0,
      categoryId: "cat-restaurants",
      date: `${month}-09`,
      accountId: "card",
      note: "Dinner",
    });
    add({
      type: "expense",
      amount: 1450,
      categoryId: "cat-utilities",
      date: `${month}-10`,
      accountId: "card",
      note: "Utilities",
    });
    add({
      type: "expense",
      amount: 320 + i * 40,
      categoryId: "cat-taxi",
      date: `${month}-13`,
      accountId: "card",
      note: "Uklon",
    });
    if (!current)
      add({
        type: "expense",
        amount: 900 + i * 150,
        categoryId: "cat-games",
        date: `${month}-18`,
        accountId: "card",
        note: "Steam",
      });
  });
  add({
    type: "expense",
    amount: 2890,
    categoryId: "cat-clothes",
    date: "2026-08-22",
    accountId: "card",
    note: "Sneakers",
    tags: ["gift"],
  });
  add({
    type: "expense",
    amount: 640,
    categoryId: "cat-pharmacy",
    date: "2026-09-08",
    accountId: "cash",
    note: "Pharmacy",
  });
  add({
    type: "transfer",
    amount: 10000,
    categoryId: "",
    date: "2026-09-06",
    accountId: "card",
    toAccountId: "cash",
    toAmount: 10000,
  });
  return out;
}

// The account the screenshots show, in a theme
export function visualState(theme: "dark" | "light"): AppState {
  return {
    ...DEFAULT_STATE,
    transactions: entries(),
    savings: [
      { id: "card", name: "Mono Black", icon: "💳", kind: "card", currency: "UAH", openingBalance: 42000 },
      { id: "cash", name: "Wallet", icon: "💵", kind: "cash", currency: "UAH", openingBalance: 3500 },
      {
        id: "usd",
        name: "Rainy day",
        icon: "🏦",
        kind: "savings",
        currency: "USD",
        openingBalance: 5200,
        goal: { target: 10000, deadline: "2027-12-31" },
      },
    ],
    recurring: [
      {
        id: "rent",
        type: "expense",
        amount: 15000,
        currency: "UAH",
        categoryId: "cat-rent",
        note: "Rent",
        accountId: "card",
        dayOfMonth: 1,
        startMonth: "2026-04",
      },
    ],
    subscriptions: [
      {
        id: "netflix",
        name: "Netflix",
        icon: "🎬",
        price: 399,
        currency: "UAH",
        period: "monthly",
        accountId: "card",
        dayOfMonth: 12,
        startMonth: "2026-04",
        active: true,
      },
      {
        id: "icloud",
        name: "iCloud+",
        icon: "☁️",
        price: 99,
        currency: "UAH",
        period: "monthly",
        accountId: "card",
        dayOfMonth: 26,
        startMonth: "2026-04",
        active: true,
      },
    ],
    investments: [
      {
        id: "deposit",
        name: "Deposit 14.5%",
        kind: "deposit",
        currency: "UAH",
        principal: 50000,
        annualRatePct: 14.5,
        startDate: "2026-03-01",
        endDate: "2027-03-01",
        compounding: "reinvest",
        compoundingFreq: "monthly",
      },
    ],
    budgets: [
      { categoryId: "cat-food", limit: 9000, currency: "UAH" },
      { categoryId: "cat-wants", limit: 3000, currency: "UAH", rollover: true },
    ],
    debts: [
      {
        id: "car",
        name: "Car loan",
        icon: "🚗",
        kind: "loan",
        currency: "UAH",
        balance: 86000,
        principal: 150000,
        annualRatePct: 14,
        monthlyPayment: 5200,
      },
    ],
    receivables: [
      {
        id: "oleh",
        name: "Oleh",
        icon: "🤝",
        amount: 4000,
        currency: "UAH",
        date: "2026-08-10",
        dueDate: "2026-09-30",
        repaid: 1500,
      },
    ],
    settings: {
      ...DEFAULT_STATE.settings,
      baseCurrency: "UAH",
      theme,
      locale: "en",
      rates: { USD: 41.2, EUR: 48.1 },
      ratesUpdatedAt: "2026-09-15T06:30:00.000Z",
      ratesSource: "manual",
    },
  };
}
