import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, SavingsAccount, Transaction } from "@/features/data/model/types";
import { deleteSchedule, syncSchedule } from "@/features/transactions/model/schedules";

import {
  absorbOperation,
  applyImport,
  applyLearnedName,
  applyLearnedRule,
  cashWithdrawals,
  learnedName,
  learnedRule,
  markDuplicates,
  matchPlanned,
  pairTransfers,
  prepareImport,
  renameOf,
  ruleMatches,
  suggestCategory,
  suggestSubscriptions,
  type ImportCandidate,
} from "./import";

// An account of a kind and currency
const account = (
  id: string,
  kind: SavingsAccount["kind"],
  currency: SavingsAccount["currency"] = "UAH",
): SavingsAccount => ({
  id,
  name: id,
  icon: "💳",
  kind,
  currency,
  openingBalance: 0,
});

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [account("black", "card"), account("usd", "card", "USD"), account("wallet", "cash")],
};

// A bank operation to import with the given fields
const line = (over: Partial<ImportCandidate>): ImportCandidate => ({
  externalId: `mono:${Math.random().toString(36).slice(2)}`,
  date: "2026-09-10",
  type: "expense",
  amount: 100,
  currency: "UAH",
  description: "",
  categoryId: "cat-other-exp",
  duplicate: false,
  ...over,
});

describe("pairTransfers", () => {
  it("turns money out of one card and into another into one transfer", () => {
    const out = line({ accountId: "black", amount: 5000, time: 1_000 });
    const into = line({ accountId: "usd", type: "income", amount: 5000, time: 1_030 });
    const [transfer, ...rest] = pairTransfers([out, into]);
    expect(rest).toHaveLength(0);
    expect(transfer).toMatchObject({
      type: "transfer",
      accountId: "black",
      toAccountId: "usd",
      pairedId: into.externalId,
    });
  });

  it("pairs a currency purchase through the operation amount", () => {
    const out = line({ accountId: "black", amount: 41_500, opAmount: 1000, opCurrency: "USD", time: 5_000 });
    const into = line({ accountId: "usd", type: "income", amount: 1000, currency: "USD", time: 5_010 });
    const [transfer] = pairTransfers([out, into]);
    expect(transfer).toMatchObject({ type: "transfer", amount: 41_500, currency: "UAH", toAmount: 1000 });
  });

  it("leaves lines alone when they are too far apart, on the same account, or differ in amount", () => {
    const far = pairTransfers([
      line({ accountId: "black", time: 0 }),
      line({ accountId: "usd", type: "income", time: 3_600 }),
    ]);
    expect(far.map((c) => c.type)).toEqual(["expense", "income"]);
    const same = pairTransfers([line({ accountId: "black" }), line({ accountId: "black", type: "income" })]);
    expect(same.map((c) => c.type)).toEqual(["expense", "income"]);
    const other = pairTransfers([
      line({ accountId: "black" }),
      line({ accountId: "usd", type: "income", amount: 101 }),
    ]);
    expect(other.map((c) => c.type)).toEqual(["expense", "income"]);
  });
});

describe("cashWithdrawals", () => {
  it("books a cash machine withdrawal as a transfer to the wallet", () => {
    const [c] = cashWithdrawals(state, [line({ accountId: "black", mcc: 6011, amount: 2000 })]);
    expect(c).toMatchObject({ type: "transfer", toAccountId: "wallet", categoryId: "" });
  });

  it("keeps spending that is not a withdrawal, and withdrawals when no cash account exists", () => {
    expect(cashWithdrawals(state, [line({ accountId: "black", mcc: 5411 })])[0]?.type).toBe("expense");
    const noCash = { ...state, savings: [account("black", "card")] };
    expect(cashWithdrawals(noCash, [line({ accountId: "black", mcc: 6011 })])[0]?.type).toBe("expense");
  });
});

// A planned rent payment with the given fields
const planned = (over: Partial<Transaction>): Transaction => ({
  id: "rec:rent:2026-09",
  type: "expense",
  amount: 14_000,
  currency: "UAH",
  categoryId: "cat-rent",
  date: "2026-09-01",
  recurringId: "rent",
  ...over,
});

// The state with these entries
const withPlan = (...transactions: Transaction[]): AppState => ({ ...state, transactions });

describe("matchPlanned", () => {
  it("recognises the real payment of a planned entry", () => {
    const [c] = matchPlanned(withPlan(planned({})), [line({ amount: 14_000, date: "2026-09-02", accountId: "black" })]);
    expect(c?.planned?.id).toBe("rec:rent:2026-09");
    expect(c?.categoryId).toBe("cat-rent");
  });

  it("allows a changed price when the description names the subscription", () => {
    const sub = planned({
      id: "sub:yt:2026-09",
      recurringId: undefined,
      subscriptionId: "yt",
      amount: 179,
      note: "YouTube Premium",
      categoryId: "cat-subs",
    });
    const named = matchPlanned(withPlan(sub), [
      line({ amount: 199, description: "YouTube Premium · Google", date: "2026-09-03" }),
    ]).at(0);
    expect(named?.planned?.id).toBe("sub:yt:2026-09");
    const unnamed = matchPlanned(withPlan(sub), [line({ amount: 199, description: "Silpo", date: "2026-09-03" })]).at(
      0,
    );
    expect(unnamed?.planned).toBeUndefined();
  });

  it("ignores payments far from the planned day or already matched", () => {
    const late = matchPlanned(withPlan(planned({})), [line({ amount: 14_000, date: "2026-09-20" })]).at(0);
    expect(late?.planned).toBeUndefined();
    const imported = matchPlanned(withPlan(planned({ externalId: "mono:old" })), [
      line({ amount: 14_000, date: "2026-09-01" }),
    ]).at(0);
    expect(imported?.planned).toBeUndefined();
    const two = matchPlanned(withPlan(planned({})), [
      line({ amount: 14_000, date: "2026-09-01" }),
      line({ amount: 14_000, date: "2026-09-02" }),
    ]);
    expect(two.filter((c) => c.planned)).toHaveLength(1);
  });
});

describe("applyImport", () => {
  it("fills in the planned entry with the real payment and adds the rest", () => {
    const s = { ...state, transactions: [planned({})] };
    const rent = line({
      externalId: "mono:rent",
      amount: 13_900,
      date: "2026-09-02",
      accountId: "black",
      planned: { id: "rec:rent:2026-09", label: "Rent" },
    });
    const coffee = line({ externalId: "mono:coffee", amount: 80, description: "Coffee", accountId: "black" });
    const out = applyImport(s, [rent, coffee], () => "new-id");
    expect(out.transactions).toHaveLength(2);
    expect(out.transactions[0]).toMatchObject({
      id: "rec:rent:2026-09",
      amount: 13_900,
      date: "2026-09-02",
      externalId: "mono:rent",
      recurringId: "rent",
    });
    expect(out.transactions[1]).toMatchObject({ id: "new-id", note: "Coffee", externalId: "mono:coffee" });
  });

  it("recognises a transfer again after it was imported, by either of its lines", () => {
    const out = line({ accountId: "black", time: 1 });
    const into = line({ accountId: "usd", type: "income", time: 2 });
    const [transfer] = pairTransfers([out, into]);
    const after = applyImport(state, [transfer!], () => "t1");
    const again = markDuplicates(after, pairTransfers([{ ...out }, { ...into }]));
    expect(again[0]?.duplicate).toBe(true);
  });

  it("runs the whole preparation in one call", () => {
    const s = { ...state, transactions: [planned({})] };
    const prepared = prepareImport(s, [
      line({ accountId: "black", amount: 14_000, date: "2026-09-01" }),
      line({ accountId: "black", mcc: 6011, amount: 500, date: "2026-09-05" }),
    ]);
    expect(prepared.map((c) => c.type)).toEqual(["transfer", "expense"]);
    expect(prepared[1]?.planned?.id).toBe("rec:rent:2026-09");
  });
});

// A monthly charge with a note
const charge = (id: string, date: string, amount: number, note: string): Transaction => ({
  id,
  type: "expense",
  amount,
  currency: "UAH",
  categoryId: "cat-subs",
  date,
  note,
  accountId: "black",
});

describe("suggestSubscriptions", () => {
  it("finds a merchant charged monthly on about the same day and amount", () => {
    const s = {
      ...state,
      transactions: [
        charge("1", "2026-07-12", 349, "NETFLIX.COM 07/12"),
        charge("2", "2026-08-12", 349, "NETFLIX.COM 08/12"),
        charge("3", "2026-09-13", 379, "NETFLIX.COM 09/13"),
      ],
    };
    const [found, ...rest] = suggestSubscriptions(s, "2026-09-28");
    expect(rest).toHaveLength(0);
    expect(found).toMatchObject({ key: "netflix com", amount: 379, months: 3, dayOfMonth: 13, startMonth: "2026-10" });
  });

  it("skips shops visited often, one-off charges, drifting amounts and known subscriptions", () => {
    const s = {
      ...state,
      subscriptions: [
        {
          id: "yt",
          name: "YouTube",
          icon: "",
          price: 179,
          currency: "UAH" as const,
          period: "monthly" as const,
          dayOfMonth: 5,
          startMonth: "2026-01",
          active: true,
        },
      ],
      transactions: [
        charge("a", "2026-08-02", 400, "Silpo"),
        charge("b", "2026-08-15", 900, "Silpo"),
        charge("c", "2026-09-03", 420, "Silpo"),
        charge("d", "2026-09-20", 99, "Gym"),
        charge("e", "2026-08-10", 200, "Taxi"),
        charge("f", "2026-09-10", 900, "Taxi"),
        charge("g", "2026-08-05", 179, "YouTube Premium"),
        charge("h", "2026-09-05", 179, "YouTube Premium"),
      ],
    };
    expect(suggestSubscriptions(s, "2026-09-28")).toEqual([]);
  });
});

// A Monobank operation with an id and the given fields
const mono = (id: string, over: Partial<ImportCandidate>) => line({ externalId: `mono:${id}`, ...over });

describe("absorbOperation (one operation at a time, as the webhook sends them)", () => {
  let n = 0;
  // A fresh id for each new entry
  const makeId = () => `id-${++n}`;

  it("adds a new operation once, keeping when it happened", () => {
    const op = mono("a", { accountId: "black", amount: 80, time: 1_700_000_000, description: "Coffee" });
    const once = absorbOperation(state, op, makeId);
    expect(once.transactions).toHaveLength(1);
    expect(once.transactions[0]?.bank).toEqual({ time: 1_700_000_000 });
    expect(absorbOperation(once, op, makeId)).toBe(once);
  });

  it("turns the half of a transfer booked first into one transfer when the other half arrives", () => {
    const out = mono("out", { accountId: "black", amount: 41_500, opAmount: 1000, opCurrency: "USD", time: 5_000 });
    const into = mono("in", { accountId: "usd", type: "income", amount: 1000, currency: "USD", time: 5_020 });
    const first = absorbOperation(state, out, makeId);
    const both = absorbOperation(first, into, makeId);
    expect(both.transactions).toHaveLength(1);
    expect(both.transactions[0]).toMatchObject({
      type: "transfer",
      accountId: "black",
      toAccountId: "usd",
      amount: 41_500,
      currency: "UAH",
      toAmount: 1000,
      externalId: "mono:out",
    });
    expect(both.transactions[0]?.bank?.pairedId).toBe("mono:in");
    expect(absorbOperation(both, into, makeId)).toBe(both);
    expect(markDuplicates(both, [into]).map((c) => c.duplicate)).toEqual([true]);
    const reversed = absorbOperation(absorbOperation(state, into, makeId), out, makeId);
    expect(reversed.transactions).toHaveLength(1);
    expect(reversed.transactions[0]).toMatchObject({
      type: "transfer",
      accountId: "black",
      toAccountId: "usd",
      toAmount: 1000,
    });
  });

  it("books a withdrawal as cash and a planned payment in place of its plan", () => {
    const cash = absorbOperation(state, mono("atm", { accountId: "black", mcc: 6011, amount: 2000 }), makeId);
    expect(cash.transactions[0]).toMatchObject({ type: "transfer", toAccountId: "wallet" });
    const rent = absorbOperation(
      withPlan(planned({})),
      mono("rent", { accountId: "black", amount: 14_000, date: "2026-09-02" }),
      makeId,
    );
    expect(rent.transactions).toHaveLength(1);
    expect(rent.transactions[0]).toMatchObject({ id: "rec:rent:2026-09", externalId: "mono:rent", date: "2026-09-02" });
  });
});

// An entry typed by hand on a day
const handTyped = (id: string, note: string): Transaction => ({
  id,
  type: "expense",
  amount: 8,
  currency: "UAH",
  categoryId: "cat-transport",
  date: "2026-09-10",
  note,
});

describe("markDuplicates", () => {
  it("knows an entry typed by hand or from a receipt by its sum a day apart, whatever its note", () => {
    const s = { ...state, transactions: [{ ...handTyped("t1", "Kyiv metro"), date: "2026-09-09" }] };
    const found = [line({ amount: 8, description: "METRO KYIV" }), line({ amount: 8, description: "METRO KYIV" })];
    expect(markDuplicates(s, found).map((c) => c.duplicate)).toEqual([true, false]);
    expect(markDuplicates(s, [line({ amount: 8, date: "2026-09-12" })])[0]?.duplicate).toBe(false);
  });

  it("matches each entry typed by hand to one operation only", () => {
    const s = { ...state, transactions: [handTyped("t1", "Metro")] };
    const rides = [line({ amount: 8, description: "Metro" }), line({ amount: 8, description: "Metro" })];
    expect(markDuplicates(s, rides).map((c) => c.duplicate)).toEqual([true, false]);
  });

  it("lets an operation known by its id use up its own match first", () => {
    const first = line({ amount: 8, description: "Metro", externalId: "csv:1" });
    const s = { ...state, transactions: [{ ...handTyped("t1", "Metro"), externalId: "csv:1" }] };
    const second = line({ amount: 8, description: "Metro", externalId: "csv:2" });
    expect(markDuplicates(s, [second, first]).map((c) => c.duplicate)).toEqual([false, true]);
  });

  it("stores the pair of a transfer from a statement and knows it next time", () => {
    const out = line({ externalId: "mono:o", accountId: "black", amount: 500, time: 10 });
    const into = line({ externalId: "mono:i", accountId: "usd", type: "income", amount: 500, time: 20 });
    const paired = prepareImport(state, [out, into]);
    const imported = applyImport(state, paired, () => "x");
    expect(imported.transactions[0]?.bank?.pairedId).toBe("mono:i");
    expect(markDuplicates(imported, [into]).map((c) => c.duplicate)).toEqual([true]);
  });
});

describe("schedules keep real payments", () => {
  const rule = {
    id: "rent",
    type: "expense" as const,
    amount: 14_000,
    currency: "UAH" as const,
    categoryId: "cat-rent",
    dayOfMonth: 1,
    startMonth: "2026-09",
  };

  it("editing the rule does not overwrite an imported payment", () => {
    const s: AppState = {
      ...state,
      recurring: [{ ...rule, amount: 15_000 }],
      transactions: [planned({ amount: 13_900, externalId: "mono:rent" })],
    };
    const synced = syncSchedule(s, "recurring", "rent");
    expect(synced.transactions.find((t) => t.id === "rec:rent:2026-09")?.amount).toBe(13_900);
  });

  it("deleting the rule keeps the real payment as a plain entry", () => {
    const s: AppState = {
      ...state,
      recurring: [rule],
      transactions: [planned({ externalId: "mono:rent" }), planned({ id: "rec:rent:2026-10", date: "2026-10-01" })],
    };
    const out = deleteSchedule(s, "recurring", "rent");
    expect(out.transactions.map((t) => t.id)).toEqual(["rec:rent:2026-09"]);
    expect(out.transactions[0]?.recurringId).toBeUndefined();
  });
});

describe("tax payments marked paid", () => {
  it("are replaced by the real bank payment instead of doubled", () => {
    const marker: Transaction = {
      id: "tax:2026-Q3:esv",
      type: "expense",
      amount: 5707.02,
      currency: "UAH",
      categoryId: "cat-taxes",
      date: "2026-10-20",
      note: "ЄСВ",
    };
    const s = { ...state, transactions: [marker] };
    const [c] = prepareImport(s, [
      line({ externalId: "mono:esv", accountId: "black", amount: 5707.02, date: "2026-10-20", description: "ЄСВ ФОП" }),
    ]);
    expect(c?.duplicate).toBe(false);
    expect(c?.planned?.id).toBe("tax:2026-Q3:esv");
  });
});

// An entry the bank brought in, with the given fields
const imported = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  type: "expense",
  amount: 120,
  currency: "UAH",
  categoryId: "cat-other-exp",
  date: "2026-09-10",
  externalId: `mono:${String(Math.random())}`,
  ...over,
});

describe("rules learned from a correction", () => {
  it("matches a rule by its words, whatever the digits and punctuation around them", () => {
    expect(ruleMatches({ match: "silpo kyiv" }, "SILPO 1234 KYIV")).toBe(true);
    expect(ruleMatches({ match: "Netflix" }, "NETFLIX.COM 12/09")).toBe(true);
    expect(ruleMatches({ match: "7-11" }, "7-11 STORE")).toBe(true);
    expect(ruleMatches({ match: "7-11" }, "ATB MARKET")).toBe(false);
    expect(ruleMatches({ match: "silpo" }, "ATB")).toBe(false);
  });

  it("offers a rule when an imported entry moves to another category, with the merchant's other entries", () => {
    const tx = imported({ note: "SILPO 1234 KYIV" });
    const older = imported({ note: "Silpo #88 Kyiv" });
    const typed = { ...imported({ note: "Silpo Kyiv" }), externalId: undefined };
    const s = { ...state, transactions: [tx, older, typed] };
    const learned = learnedRule(s, tx, "cat-food");
    expect(learned?.match).toBe("silpo kyiv");
    expect(learned?.others.map((o) => o.id)).toEqual([older.id]);
  });

  it("offers nothing for typed entries, transfers or a category a rule already gives", () => {
    const tx = imported({ note: "SILPO KYIV" });
    expect(learnedRule(state, { ...tx, externalId: undefined }, "cat-food")).toBeNull();
    expect(learnedRule(state, { ...tx, type: "transfer" }, "cat-food")).toBeNull();
    expect(learnedRule(state, tx, tx.categoryId)).toBeNull();
    const ruled = { ...state, rules: [{ id: "r", match: "silpo", categoryId: "cat-food", type: "expense" as const }] };
    expect(learnedRule(ruled, tx, "cat-food")).toBeNull();
  });

  it("puts the new rule first, so it wins over a broader one, and moves the others only when asked", () => {
    const tx = imported({ note: "SILPO KYIV" });
    const older = imported({ note: "SILPO 7 KYIV" });
    const s = {
      ...state,
      transactions: [tx, older],
      rules: [{ id: "old", match: "silpo", categoryId: "cat-other-exp", type: "expense" as const }],
    };
    const learned = learnedRule(s, tx, "cat-food")!;
    const kept = applyLearnedRule(s, learned, "cat-food", false, "new");
    expect(kept.rules.map((r) => r.id)).toEqual(["new", "old"]);
    expect(kept.transactions.find((o) => o.id === older.id)?.categoryId).toBe("cat-other-exp");
    expect(suggestCategory(kept, "SILPO 55 KYIV", "expense")).toBe("cat-food");
    const moved = applyLearnedRule(s, learned, "cat-food", true, "new");
    expect(moved.transactions.find((o) => o.id === older.id)?.categoryId).toBe("cat-food");
  });
});

describe("clean merchant names", () => {
  const rule = {
    id: "r",
    match: "aroma kava",
    categoryId: "cat-coffee",
    type: "expense" as const,
    rename: "Aroma Kava",
  };

  it("gives an imported operation the rule's name and keeps the bank's words, marked to review", () => {
    expect(renameOf({ ...state, rules: [rule] }, "AROMA KAVA 22 KYIV")).toBe("Aroma Kava");
    const next = applyImport({ ...state, rules: [rule] }, [line({ description: "AROMA KAVA 22 KYIV" })], () => "n1");
    expect(next.transactions[0]).toMatchObject({
      note: "Aroma Kava",
      bank: { text: "AROMA KAVA 22 KYIV" },
      unreviewed: true,
    });
  });

  it("learns a new name from an edited bank entry and renames the others only when asked", () => {
    const tx: Transaction = {
      id: "t1",
      type: "expense",
      amount: 60,
      currency: "UAH",
      categoryId: "cat-coffee",
      date: "2026-09-10",
      note: "AROMA KAVA 22",
      externalId: "mono:1",
    };
    const older: Transaction = { ...tx, id: "t0", externalId: "mono:0", note: "AROMA KAVA 7" };
    const s = { ...state, transactions: [tx, older] };
    expect(learnedName(s, tx, "AROMA KAVA 22")).toBeNull();
    expect(learnedName(s, { ...tx, externalId: undefined }, "Aroma Kava")).toBeNull();
    const learned = learnedName(s, tx, "Aroma Kava")!;
    expect(learned).toMatchObject({ match: "aroma kava", others: [older] });
    const kept = applyLearnedName(s, learned, "Aroma Kava", "cat-coffee", false, "r1");
    expect(kept.rules[0]).toMatchObject({ match: "aroma kava", rename: "Aroma Kava", categoryId: "cat-coffee" });
    expect(kept.transactions.find((o) => o.id === "t0")?.note).toBe("AROMA KAVA 7");
    const renamed = applyLearnedName(s, learned, "Aroma Kava", "cat-coffee", true, "r1");
    expect(renamed.transactions.find((o) => o.id === "t0")).toMatchObject({
      note: "Aroma Kava",
      bank: { text: "AROMA KAVA 7" },
    });
  });
});

describe("an operation that confirms a typed entry", () => {
  it("gives the typed entry the bank's mark and keeps its note, category and account", () => {
    const typed = { ...handTyped("t1", "Kyiv metro"), accountId: "black" };
    const op = line({ amount: 8, description: "METRO KYIV", accountId: "black", externalId: "mono:9", time: 1 });
    const next = absorbOperation({ ...state, transactions: [typed] }, op, () => "new");
    expect(next.transactions).toEqual([{ ...typed, externalId: "mono:9", bank: { time: 1 } }]);
  });
});
