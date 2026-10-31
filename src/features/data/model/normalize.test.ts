import { describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { ESV_MIN_UAH, esvMinimum } from "@/features/income/model/tax";

import { exportBackup, normalizePlannedEvents, normalizeState, normalizeTags, parseBackup } from "./normalize";

// A valid expense with any fields changed
const expense = (fields: Record<string, unknown> = {}) => ({
  id: "t1",
  type: "expense",
  amount: 100,
  currency: "UAH",
  categoryId: "cat-food",
  date: "2026-09-01",
  ...fields,
});

describe("normalizeState", () => {
  it("falls back to the defaults for anything that is not a state", () => {
    expect(normalizeState(null)).toBe(DEFAULT_STATE);
    expect(normalizeState({}).categories).toEqual(DEFAULT_STATE.categories);
    expect(normalizeState({}).settings).toMatchObject({ baseCurrency: "UAH", theme: "system", ratesSource: "manual" });
  });

  it("keeps valid entries and drops broken ones", () => {
    const state = normalizeState({
      transactions: [
        expense(),
        expense({ id: "", amount: 5 }),
        expense({ id: "t2", amount: -1 }),
        expense({ id: "t3", date: "1.9.2026" }),
      ],
    });
    expect(state.transactions.map((tx) => tx.id)).toEqual(["t1"]);
  });

  it("cleans tags, external ids and bank lines and drops transfer fields from other entries", () => {
    const [tx] = normalizeState({
      transactions: [
        expense({
          tags: ["#Trip", "trip", " work "],
          externalId: "  ",
          bank: { time: 12.6 },
          toAmount: 5,
          attachmentIds: ["a b", "ok-1"],
        }),
      ],
    }).transactions;
    expect(tx).toMatchObject({ tags: ["Trip", "work"], bank: { time: 13 }, attachmentIds: ["ok-1"] });
    expect(tx).not.toHaveProperty("externalId");
    expect(tx).not.toHaveProperty("toAmount");
  });

  it("keeps an entry left out of reports only when it says so plainly", () => {
    const [kept, dropped] = normalizeState({
      transactions: [expense({ id: "a", excluded: true }), { ...expense({ id: "b" }), excluded: "yes" }],
    }).transactions;
    expect(kept).toMatchObject({ excluded: true });
    expect(dropped).not.toHaveProperty("excluded");
  });

  it("gives transfers no category and their own amount on the other side", () => {
    const [tx] = normalizeState({
      transactions: [expense({ type: "transfer", categoryId: undefined, accountId: "a", toAccountId: "b" })],
    }).transactions;
    expect(tx).toMatchObject({ type: "transfer", categoryId: "", toAmount: 100 });
    expect(
      normalizeState({ transactions: [expense({ type: "transfer", accountId: "a", toAccountId: "a" })] }).transactions,
    ).toEqual([]);
  });

  it("moves old salary breakdowns onto their entries", () => {
    const breakdown = { days: 20, dailyRate: 100, premium: 0, compensations: 0, cutoffs: 0 };
    const state = normalizeState({
      transactions: [expense({ type: "income" })],
      incomeEntries: [
        { transactionId: "t1", ...breakdown },
        { transactionId: "t9", days: "x" },
      ],
    });
    expect(state.transactions[0]?.breakdown).toEqual(breakdown);
  });

  it("keeps goals with their accounts once each, and drops broken ones", () => {
    const goals = normalizeState({
      goals: [
        {
          id: "g",
          name: " Trip ",
          target: 100,
          currency: "UAH",
          saved: -5,
          accountIds: ["a", "a", 3],
          deadline: "2027-01-01",
        },
        { id: "bad", name: "No target", target: 0, currency: "UAH" },
      ],
    }).goals;
    expect(goals).toEqual([
      {
        id: "g",
        name: "Trip",
        icon: "🎯",
        target: 100,
        currency: "UAH",
        saved: 0,
        deadline: "2027-01-01",
        accountIds: ["a"],
      },
    ]);
  });

  it("keeps a rule's frequency, weekly skips and an instalment plan", () => {
    const rule = {
      id: "r",
      type: "expense",
      amount: 500,
      currency: "UAH",
      categoryId: "c",
      dayOfMonth: 5,
      startMonth: "2026-10",
      period: "weekly",
      skipped: ["2026-10-12", "2026-09-28", "bad"],
      instalment: { total: 6000, count: 12 },
    };
    expect(normalizeState({ recurring: [rule] }).recurring[0]).toMatchObject({
      period: "weekly",
      skipped: ["2026-10-12"],
      instalment: { total: 6000, count: 12 },
    });
    const monthly = normalizeState({ recurring: [{ ...rule, period: "monthly", instalment: { total: 1, count: 1 } }] });
    expect(monthly.recurring[0]?.period).toBeUndefined();
    expect(monthly.recurring[0]?.instalment).toBeUndefined();
  });

  it("keeps every entry of a yearly plan and checks its period", () => {
    const sub = {
      id: "s1",
      name: "Box",
      icon: "📦",
      price: 1200,
      currency: "UAH",
      period: "yearly",
      dayOfMonth: 1,
      startMonth: "2026-01",
      active: true,
      skipped: ["2026-03", "2025-12", "2026-03", "bad"],
    };
    const state = normalizeState({
      subscriptions: [sub],
      transactions: [expense({ subscriptionId: "s1", amount: 1200 }), expense({ id: "t2", subscriptionId: "s1" })],
    });
    expect(state.transactions).toHaveLength(2);
    expect(state.subscriptions[0]?.skipped).toEqual(["2026-03"]);
    expect(state.subscriptions[0]).not.toHaveProperty("lastAppliedMonth");
    expect(normalizeState({ subscriptions: [{ ...sub, period: "daily" }] }).subscriptions).toEqual([]);
    expect(normalizeState({ subscriptions: [{ ...sub, period: "weekly" }] }).subscriptions[0]?.period).toBe("weekly");
    expect(normalizeState({ subscriptions: [{ ...sub, period: undefined }] }).subscriptions[0]?.period).toBe("monthly");
  });

  it("keeps parents only for top categories of the same kind and renames old defaults", () => {
    const state = normalizeState({
      categories: [
        { id: "top", name: "Top", icon: "x", colorSlot: 1, kind: "expense" },
        { id: "child", name: "Child", icon: "x", colorSlot: 1, kind: "expense", parentId: "top" },
        { id: "deep", name: "Deep", icon: "x", colorSlot: 1, kind: "expense", parentId: "child" },
        { id: "cross", name: "Cross", icon: "x", colorSlot: 1, kind: "income", parentId: "top" },
        { id: "cat-cafe", name: "Кафе й ресторани", icon: "x", colorSlot: 1, kind: "expense" },
      ],
    });
    expect(state.categories.map((c) => [c.id, c.parentId])).toEqual([
      ["top", undefined],
      ["child", "top"],
      ["deep", undefined],
      ["cross", undefined],
      ["cat-cafe", undefined],
    ]);
    expect(state.categories[4]?.name).toBe("Cafes & Restaurants");
  });

  it("reads old accounts with a balance and keeps the fields of each kind", () => {
    const [cash, skins, crypto] = normalizeState({
      savings: [
        { id: "a", name: "Cash", icon: "💵", currency: "UAH", balance: 50, kind: "nope", game: "cs2" },
        {
          id: "b",
          name: "Skins",
          icon: "🎮",
          currency: "USD",
          openingBalance: 1,
          kind: "skins",
          game: "custom",
          gameName: "  ",
        },
        {
          id: "c",
          name: "Coins",
          icon: "₿",
          currency: "USD",
          openingBalance: 0,
          kind: "crypto",
          holdings: [
            { coin: "bitcoin", quantity: 1 },
            { coin: "bitcoin", quantity: 2 },
          ],
        },
      ],
    }).savings;
    expect(cash).toMatchObject({ kind: "card", openingBalance: 50, game: undefined });
    expect(skins).toMatchObject({ kind: "skins", game: undefined, gameName: undefined });
    expect(crypto?.holdings).toEqual([{ coin: "bitcoin", quantity: 1, price: undefined, icon: undefined }]);
  });

  it("keeps market values only for market investments", () => {
    const base = {
      id: "i",
      name: "Fund",
      currency: "UAH",
      principal: 1000,
      annualRatePct: 10,
      startDate: "2026-01-01",
      compounding: "reinvest",
      compoundingFreq: "monthly",
    };
    const [deposit, stocks] = normalizeState({
      investments: [
        { ...base, marketValue: 5 },
        { ...base, id: "j", kind: "stocks" },
      ],
    }).investments;
    expect(deposit).toMatchObject({ kind: "deposit", marketValue: undefined });
    expect(stocks).toMatchObject({ kind: "stocks", marketValue: 1000 });
  });

  it("keeps one snapshot a day in date order", () => {
    const snapshot = { total: 1, savings: 1, investments: 0, debts: 0 };
    const state = normalizeState({
      snapshots: [
        { date: "2026-09-02", ...snapshot },
        { date: "2026-09-01", ...snapshot, total: 5 },
        { date: "2026-09-01", ...snapshot, total: 7, receivables: 2, rates: { USD: 40 } },
        { date: "2026-09-03", ...snapshot, total: "x" },
      ],
    });
    expect(state.snapshots.map((s) => [s.date, s.total, s.receivables, s.rates.USD])).toEqual([
      ["2026-09-01", 7, 2, 40],
      ["2026-09-02", 1, 0, DEFAULT_STATE.settings.rates.USD],
    ]);
  });

  it("checks the settings field by field", () => {
    const { settings } = normalizeState({
      settings: {
        baseCurrency: "GBP",
        theme: "dark",
        locale: "uk",
        rates: { USD: -1, EUR: 45 },
        ratesSource: "nbu",
        ratesMeta: { USD: { buy: 40, sell: 41 } },
        taxPaid: { q1: "2026-04-01", q2: "soon" },
        bankLinks: { "card-1": "acc", "bad id": "acc" },
        notify: { operations: false, budgets: true },
        tax: { ratePct: 10, fixedUAH: 0 },
      },
    });
    expect(settings).toMatchObject({
      baseCurrency: "UAH",
      theme: "dark",
      locale: "uk",
      rates: { USD: DEFAULT_STATE.settings.rates.USD, EUR: 45 },
      ratesSource: "nbu",
      taxPaid: { q1: "2026-04-01" },
      bankLinks: { "card-1": "acc" },
      notify: { operations: false, budgets: undefined },
      tax: { regime: "custom", ratePct: 10, fixedUAH: 0 },
    });
  });

  it("checks receivables, wishes and rules", () => {
    vi.useFakeTimers({ now: new Date("2026-10-18T12:00:00Z"), toFake: ["Date"] });
    const state = normalizeState({
      receivables: [
        { id: "r", name: "Loan", currency: "UAH", amount: 100, repaid: 500, date: "2026-01-01" },
        { id: "x", name: "No date", currency: "UAH", amount: 1 },
      ],
      wishlist: [{ id: "w", name: "Bike", currency: "UAH", price: 10, priority: "urgent", url: "http://x.com/a" }],
      rules: [
        { id: "u", match: "  taxi ", categoryId: "cat-taxi" },
        { id: "v", match: " ", categoryId: "c" },
      ],
    });
    expect(state.receivables).toMatchObject([{ id: "r", repaid: 100, icon: "🤝" }]);
    expect(state.wishlist).toMatchObject([{ priority: "normal", url: undefined, createdAt: "2026-10-18" }]);
    expect(state.rules).toEqual([{ id: "u", match: "taxi", categoryId: "cat-taxi", type: "expense" }]);
    vi.useRealTimers();
  });

  it("is idempotent", () => {
    const once = normalizeState({ transactions: [expense({ tags: ["a"] })], settings: { theme: "light" } });
    expect(normalizeState(once)).toEqual(once);
  });
});

const COLLECTIONS = [
  "transactions",
  "recurring",
  "subscriptions",
  "savings",
  "investments",
  "budgets",
  "debts",
  "receivables",
  "wishlist",
  "rules",
  "plannedEvents",
  "snapshots",
] as const;

type Collection = (typeof COLLECTIONS)[number];

const BREAKDOWN = { days: 20, dailyRate: 100, premium: 0, compensations: 0, cutoffs: 0 };
const TAX = { ratePct: 5, fixedUAH: 0, gross: 1000 };

// One valid record of each collection
const VALID: Record<Collection, Record<string, unknown>> = {
  transactions: expense(),
  recurring: {
    id: "r",
    type: "expense",
    amount: 10,
    currency: "UAH",
    categoryId: "c",
    dayOfMonth: 5,
    startMonth: "2026-01",
  },
  subscriptions: {
    id: "s",
    name: "Music",
    icon: "🎵",
    price: 5,
    currency: "UAH",
    dayOfMonth: 1,
    startMonth: "2026-01",
    active: true,
  },
  savings: { id: "a", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 0 },
  investments: {
    id: "i",
    name: "Bonds",
    kind: "bonds",
    currency: "UAH",
    principal: 100,
    annualRatePct: 10,
    startDate: "2026-01-01",
    compounding: "payout",
    compoundingFreq: "monthly",
  },
  budgets: { categoryId: "c", limit: 100, currency: "UAH" },
  debts: { id: "d", name: "Loan", icon: "🏦", kind: "loan", currency: "UAH", balance: 0 },
  receivables: { id: "l", name: "Ann", amount: 10, currency: "UAH", date: "2026-01-01", repaid: 0 },
  wishlist: { id: "w", name: "Bike", price: 10, currency: "UAH" },
  rules: { id: "u", match: "coffee", categoryId: "c" },
  plannedEvents: { id: "p", month: "2026-12", amount: -5, currency: "UAH" },
  snapshots: { date: "2026-01-01", total: 1, savings: 1, investments: 0, debts: 0 },
};

// How many records of a collection survive normalizing
const kept = (name: Collection, fields: Record<string, unknown>): number =>
  normalizeState({ [name]: [{ ...VALID[name], ...fields }] })[name].length;

// Records broken by one field each
const BROKEN: Array<[Collection, Record<string, unknown>]> = [
  ["transactions", { type: "gift" }],
  ["transactions", { amount: Number.POSITIVE_INFINITY }],
  ["transactions", { currency: "GBP" }],
  ["transactions", { categoryId: "" }],
  ["transactions", { accountId: "" }],
  ["transactions", { toAccountId: "" }],
  ["transactions", { toAmount: 0 }],
  ["transactions", { breakdown: { ...BREAKDOWN, days: -1 } }],
  ["transactions", { breakdown: { ...BREAKDOWN, dailyRate: -1 } }],
  ["transactions", { breakdown: { ...BREAKDOWN, premium: "1" } }],
  ["transactions", { breakdown: { ...BREAKDOWN, compensations: null } }],
  ["transactions", { breakdown: { ...BREAKDOWN, cutoffs: "0" } }],
  ["transactions", { tax: { ...TAX, ratePct: -1 } }],
  ["transactions", { tax: { ...TAX, fixedUAH: -1 } }],
  ["transactions", { tax: { ...TAX, gross: 0 } }],
  ["transactions", { tax: { ...TAX, regime: "nope" } }],
  ["transactions", { tax: { ...TAX, vatPct: 100 } }],
  ["transactions", { tax: { ...TAX, vatPct: -1 } }],
  ["transactions", { tax: { ...TAX, label: 5 } }],
  ["transactions", { type: "transfer", accountId: "a" }],
  ["transactions", { type: "transfer", accountId: "", toAccountId: "b" }],
  ["recurring", { id: "" }],
  ["recurring", { type: "transfer" }],
  ["recurring", { amount: 0 }],
  ["recurring", { currency: "GBP" }],
  ["recurring", { categoryId: "" }],
  ["recurring", { dayOfMonth: "5" }],
  ["recurring", { startMonth: "2026" }],
  ["subscriptions", { name: "" }],
  ["subscriptions", { icon: 1 }],
  ["subscriptions", { price: 0 }],
  ["subscriptions", { currency: "GBP" }],
  ["subscriptions", { period: "daily" }],
  ["subscriptions", { dayOfMonth: null }],
  ["subscriptions", { startMonth: "x" }],
  ["subscriptions", { endMonth: "x" }],
  ["subscriptions", { active: "yes" }],
  ["savings", { id: "" }],
  ["savings", { name: "" }],
  ["savings", { icon: 1 }],
  ["savings", { currency: "GBP" }],
  ["savings", { openingBalance: "0" }],
  ["savings", { goal: { target: 0 } }],
  ["savings", { goal: { target: 10, deadline: 5 } }],
  ["investments", { id: "" }],
  ["investments", { name: "" }],
  ["investments", { currency: "GBP" }],
  ["investments", { principal: 0 }],
  ["investments", { annualRatePct: -1 }],
  ["investments", { annualRatePct: 201 }],
  ["investments", { startDate: "x" }],
  ["investments", { endDate: "2025-01-01" }],
  ["investments", { endDate: "x" }],
  ["investments", { compounding: "x" }],
  ["investments", { compoundingFreq: "weekly" }],
  ["investments", { monthlyContribution: -1 }],
  ["budgets", { categoryId: "" }],
  ["budgets", { limit: 0 }],
  ["budgets", { currency: "GBP" }],
  ["debts", { id: "" }],
  ["debts", { name: "" }],
  ["debts", { icon: 1 }],
  ["debts", { kind: "x" }],
  ["debts", { currency: "GBP" }],
  ["debts", { balance: -1 }],
  ["debts", { principal: -1 }],
  ["debts", { annualRatePct: 201 }],
  ["debts", { monthlyPayment: -1 }],
  ["receivables", { id: "" }],
  ["receivables", { currency: "GBP" }],
  ["receivables", { name: " " }],
  ["receivables", { amount: 0 }],
  ["receivables", { date: "x" }],
  ["wishlist", { id: "" }],
  ["wishlist", { currency: "GBP" }],
  ["wishlist", { name: "" }],
  ["wishlist", { price: 0 }],
  ["rules", { id: "" }],
  ["rules", { categoryId: "" }],
  ["plannedEvents", { id: "" }],
  ["plannedEvents", { currency: "GBP" }],
  ["plannedEvents", { month: "x" }],
  ["plannedEvents", { amount: 0 }],
  ["snapshots", { date: "x" }],
  ["snapshots", { savings: null }],
  ["snapshots", { investments: "0" }],
  ["snapshots", { debts: "0" }],
  ["snapshots", { receivables: "0" }],
];

// What the bank said about an entry, after normalizing
const bankOf = (bank: unknown) => normalizeState({ transactions: [expense({ bank })] }).transactions[0]?.bank;

// The tax profile made of stored tax settings
const taxOf = (tax: unknown) => normalizeState({ settings: { tax } }).settings.tax;

// The settings made of stored fields
const settingsOf = (fields: Record<string, unknown>) => normalizeState({ settings: fields }).settings;

describe("record checks", () => {
  it.each(COLLECTIONS)("keeps a valid record of %s", (name) => {
    expect(kept(name, {})).toBe(1);
  });

  it.each(BROKEN)("drops a broken record of %s: %j", (name, fields) => {
    expect(kept(name, fields)).toBe(0);
  });

  it("keeps entries with a full tax record or a salary breakdown", () => {
    expect(kept("transactions", { type: "income", tax: { ...TAX, regime: "fop3", vatPct: 0, label: "Tax" } })).toBe(1);
    expect(kept("transactions", { type: "income", breakdown: BREAKDOWN })).toBe(1);
  });

  it("drops categories with a broken field", () => {
    const valid = { id: "mine", name: "Mine", icon: "⭐", colorSlot: 1, kind: "expense" };
    // The ids of the categories left with the changed one
    const ids = (fields: Record<string, unknown>) =>
      normalizeState({ categories: [{ ...valid, ...fields }] }).categories.map((c) => c.id);
    expect(ids({})).toEqual(["mine"]);
    for (const fields of [{ id: "" }, { name: "" }, { icon: 1 }, { colorSlot: "1" }, { kind: "x" }, { parentId: "" }]) {
      expect(ids(fields)).not.toContain("mine");
    }
  });

  it("keeps what the bank said about an entry", () => {
    expect(bankOf({ time: 0, opCurrency: "USD", opAmount: 5 })).toEqual({ opAmount: 5, opCurrency: "USD" });
    expect(bankOf({ opCurrency: "GBP", opAmount: 5 })).toBeUndefined();
    expect(bankOf({ opCurrency: "USD", opAmount: -1 })).toBeUndefined();
    expect(bankOf({ pairedId: "  mono:in  " })).toEqual({ pairedId: "mono:in" });
    expect(bankOf("x")).toBeUndefined();
  });

  it("keeps the fields of each kind of account", () => {
    const [skins, card, coins] = normalizeState({
      savings: [
        {
          ...VALID.savings,
          id: "s",
          kind: "skins",
          game: "custom",
          gameName: " Factorio ",
          gameLogo: "https://example.com/f.png",
        },
        { ...VALID.savings, id: "c", bank: "monobank", game: "cs2", holdings: [{ coin: "bitcoin", quantity: 1 }] },
        {
          ...VALID.savings,
          id: "w",
          kind: "crypto",
          pricedAt: "2026-10-01T00:00:00Z",
          holdings: [
            {
              coin: "ethereum",
              quantity: 1,
              price: 3000,
              icon: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png",
            },
            { coin: "nope", quantity: 1 },
            { coin: "solana", quantity: -1 },
            { coin: "tether", quantity: 1, price: -1, icon: "https://evil.example/x.png" },
            "x",
          ],
        },
      ],
    }).savings;
    expect(skins).toMatchObject({ game: "custom", gameName: "Factorio", gameLogo: "https://example.com/f.png" });
    expect(card).toMatchObject({ bank: "monobank", game: undefined, holdings: undefined });
    expect(coins?.holdings).toEqual([
      expect.objectContaining({ coin: "ethereum", price: 3000 }),
      { coin: "tether", quantity: 1, price: undefined, icon: undefined },
    ]);
    expect(coins?.pricedAt).toBe("2026-10-01T00:00:00Z");
    const insecure = normalizeState({
      savings: [
        { ...VALID.savings, kind: "skins", game: "custom", gameName: "X", gameLogo: "http://example.com/x.png" },
      ],
    }).savings[0];
    expect(insecure?.gameLogo).toBeUndefined();
  });

  it("keeps the fields of each kind of investment", () => {
    const [odd, coin, fund] = normalizeState({
      investments: [
        { ...VALID.investments, kind: "gold", annualRatePct: 10 },
        {
          ...VALID.investments,
          id: "c",
          kind: "crypto",
          coin: "bitcoin",
          quantity: 2,
          marketValue: -1,
          coinIcon: "https://evil.example/x.png",
          pricedAt: "2026-10-01",
        },
        { ...VALID.investments, id: "f", kind: "inzhur", fund: "nope", quantity: -1 },
      ],
    }).investments;
    expect(odd).toMatchObject({ kind: "deposit", marketValue: undefined });
    expect(coin).toMatchObject({
      coin: "bitcoin",
      quantity: 2,
      marketValue: 100,
      coinIcon: undefined,
      pricedAt: "2026-10-01",
    });
    expect(fund).toMatchObject({ fund: undefined, quantity: undefined });
  });

  it("drops empty figures of a debt", () => {
    const [debt] = normalizeState({
      debts: [{ ...VALID.debts, principal: 0, annualRatePct: 0, monthlyPayment: 0, note: "  " }],
    }).debts;
    expect(debt).toEqual({
      id: "d",
      name: "Loan",
      icon: "🏦",
      kind: "loan",
      currency: "UAH",
      balance: 0,
      principal: undefined,
      annualRatePct: undefined,
      monthlyPayment: undefined,
      note: undefined,
    });
  });

  it("takes the rates of a fixed tax regime and checks those of an own one", () => {
    expect(taxOf({ regime: "fop1", ratePct: 50 })).toMatchObject({ regime: "fop1", label: "" });
    expect(taxOf({ regime: "custom", ratePct: 100, fixedUAH: -1, vatPct: 100, label: 5 })).toMatchObject({
      regime: "custom",
      ratePct: 6,
      vatPct: 0,
      label: "",
    });
    expect(taxOf({ regime: "custom", ratePct: 7, fixedUAH: 10, vatPct: 20, label: "Mine", esv: false })).toEqual({
      regime: "custom",
      ratePct: 7,
      fixedUAH: 10,
      vatPct: 20,
      label: "Mine",
      esv: false,
    });
    expect(taxOf("x")).toMatchObject({ regime: "none", esv: true });
  });

  it("leaves the social contribution out of a fixed regime for someone who does not pay it", () => {
    const paying = taxOf({ regime: "fop2" });
    const notPaying = taxOf({ regime: "fop2", esv: false });
    expect(notPaying.esv).toBe(false);
    expect(paying.fixedUAH - notPaying.fixedUAH).toBeCloseTo(esvMinimum(new Date().getFullYear()), 2);
    expect(taxOf({ regime: "general", esv: false }).ratePct).toBe(23);
  });

  it("reads old settings without a regime as no tax unless their rates were changed", () => {
    expect(taxOf({ ratePct: 6, fixedUAH: ESV_MIN_UAH }).regime).toBe("none");
    expect(taxOf({ ratePct: 10, fixedUAH: 0 }).regime).toBe("custom");
  });

  it("checks the bank rates, links and the notifications turned off", () => {
    expect(settingsOf({ ratesMeta: { USD: { buy: 0, sell: 1 } } }).ratesMeta).toBeUndefined();
    expect(
      settingsOf({ ratesMeta: { EUR: { buy: 1, sell: 2 } }, ratesSource: "monobank", ratesUpdatedAt: "2026-10-01" }),
    ).toMatchObject({
      ratesMeta: { EUR: { buy: 1, sell: 2 } },
      ratesSource: "monobank",
      ratesUpdatedAt: "2026-10-01",
    });
    expect(settingsOf({ bankLinks: { "bad id": "x" }, taxPaid: { q: "x" }, notify: { budgets: false } })).toMatchObject(
      {
        bankLinks: undefined,
        taxPaid: undefined,
        notify: { operations: undefined, budgets: false },
      },
    );
    expect(settingsOf({ notify: { operations: true } }).notify).toBeUndefined();
    expect(settingsOf({ notify: "off", theme: "neon", locale: "xx" })).toMatchObject({
      notify: undefined,
      theme: "system",
      locale: "en",
    });
  });
});

describe("the small normalizers", () => {
  it("keeps up to eight tags", () => {
    expect(normalizeTags(Array.from({ length: 10 }, (_, i) => `t${String(i)}`))).toHaveLength(8);
    expect(normalizeTags("tag")).toBeUndefined();
    expect(normalizeTags([" "])).toBeUndefined();
  });

  it("keeps planned events with a month and a sum", () => {
    expect(
      normalizePlannedEvents([
        { id: "e", month: "2026-12", amount: -500, currency: "UAH" },
        { id: "f", month: "2026-12", amount: 0, currency: "UAH" },
      ]),
    ).toEqual([{ id: "e", month: "2026-12", amount: -500, currency: "UAH", note: "" }]);
  });
});

describe("backups", () => {
  it("round-trips a state and refuses files that are not backups", () => {
    const state = normalizeState({ transactions: [expense()] });
    expect(parseBackup(exportBackup(state))).toEqual(state);
    expect(parseBackup("{")).toBe("settings.data.notJson");
    expect(parseBackup("{}")).toBe("settings.data.notBackup");
    expect(parseBackup("[]")).toBe("settings.data.notBackup");
  });
});
