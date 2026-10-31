import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Investment } from "@/features/data/model/types";
import type { InzhurQuote } from "@/features/investments/api/inzhur";

import {
  initialInvestmentForm,
  investmentFields,
  investmentProblem,
  navWorth,
  nextTerm,
  removeInvestment,
  renewInvestmentForm,
  saveInvestment,
  switchFund,
  switchInvestmentKind,
  withQuote,
  type InvestmentForm,
} from "./investmentForm";

const TODAY = "2026-10-10";
const NOW = "2026-10-10T12:00:00.000Z";

// A filled form for a new position of the given fields
const form = (over: Partial<InvestmentForm>): InvestmentForm => ({
  ...initialInvestmentForm("new", TODAY),
  name: "Position",
  principal: "1000",
  rate: "10",
  ...over,
});

const quote: InzhurQuote = {
  id: "inzhur-reit",
  name: "Inzhur REIT",
  navPerCertificate: 12,
  projectedYieldPct: 9,
  income: "dividends",
};

const coins: Investment = {
  id: "coins",
  name: "Coins",
  kind: "crypto",
  coin: "bitcoin",
  quantity: 0.5,
  marketValue: 30000,
  pricedAt: "2026-10-01T00:00:00.000Z",
  currency: "USD",
  principal: 20000,
  annualRatePct: 0,
  startDate: "2026-01-01",
  compounding: "reinvest",
  compoundingFreq: "annually",
};

describe("initialInvestmentForm", () => {
  it("starts a deposit today and fills a stored position's fields", () => {
    expect(initialInvestmentForm("new", TODAY)).toMatchObject({ kind: "deposit", startDate: TODAY, coin: "bitcoin" });
    expect(initialInvestmentForm(coins, TODAY)).toMatchObject({
      quantity: "0.5",
      marketValue: "30000",
      contribution: "",
    });
  });
});

describe("nextTerm", () => {
  it("repeats a term of whole months or of days", () => {
    expect(nextTerm("2025-10-10", "2026-10-10")).toBe("2027-10-10");
    expect(nextTerm("2026-10-01", "2026-10-15")).toBe("2026-10-29");
  });
});

describe("renewInvestmentForm", () => {
  it("puts in what an ended deposit came to for the same length again", () => {
    const deposit: Investment & { endDate: string } = {
      ...coins,
      kind: "deposit",
      compounding: "payout",
      principal: 5000,
      monthlyContribution: 100,
      startDate: "2026-04-10",
      endDate: "2026-10-10",
    };
    expect(renewInvestmentForm(deposit, TODAY)).toMatchObject({
      principal: "5600",
      startDate: "2026-10-10",
      endDate: "2027-04-10",
      contribution: "",
    });
  });
});

describe("switchInvestmentKind", () => {
  it("names a new Inzhur position after its fund in hryvnias", () => {
    const next = switchInvestmentKind(form({ name: "", currency: "USD" }), "inzhur");
    expect(next).toMatchObject({ name: "Inzhur REIT", currency: "UAH", rate: "9.5" });
  });

  it("forgets the fund's name and yield when leaving Inzhur", () => {
    const inzhur = switchInvestmentKind(form({ name: "" }), "inzhur");
    expect(switchInvestmentKind(inzhur, "stocks")).toMatchObject({ name: "", rate: "", compounding: "reinvest" });
  });

  it("pays a REIT's dividends out", () => {
    expect(switchInvestmentKind(form({}), "reit").compounding).toBe("payout");
  });
});

describe("switchFund", () => {
  it("renames a position that carried the old fund's name and drops its price", () => {
    const reit = { ...switchInvestmentKind(form({ name: "" }), "inzhur"), nav: 12 };
    expect(switchFund(reit, "inzhur-energy")).toMatchObject({
      fund: "inzhur-energy",
      name: "Inzhur Energy",
      nav: null,
      compounding: "reinvest",
    });
    expect(switchFund({ ...reit, name: "Mine" }, "inzhur-energy").name).toBe("Mine");
  });
});

describe("withQuote and navWorth", () => {
  it("prices the certificates of the fund still picked", () => {
    const reit = { ...switchInvestmentKind(form({}), "inzhur"), quantity: "10" };
    const priced = withQuote(reit, "inzhur-reit", quote, NOW);
    expect(priced).toMatchObject({ nav: 12, navAt: NOW, rate: "9" });
    expect(navWorth(priced, DEFAULT_STATE.settings)).toBe(120);
    expect(withQuote(reit, "inzhur-energy", quote, NOW)).toBe(reit);
  });
});

describe("investmentProblem", () => {
  it("names the first thing that stops saving", () => {
    expect(investmentProblem(form({ name: " " }))).toBe("balance.inv.problem.name");
    expect(investmentProblem(form({ principal: "0" }))).toBe("balance.inv.problem.principal");
    expect(investmentProblem(form({ rate: "300" }))).toBe("balance.inv.problem.rate");
    expect(investmentProblem(form({ endDate: "2026-01-01" }))).toBe("balance.inv.problem.maturity");
    expect(investmentProblem(form({ contribution: "-5" }))).toBe("balance.inv.problem.topUp");
    expect(investmentProblem(form({ kind: "crypto", quantity: "" }))).toBe("balance.inv.problem.coins");
    expect(investmentProblem(form({ kind: "stocks", rate: "", marketValue: "x" }))).toBe("balance.inv.problem.value");
    expect(investmentProblem(form({}))).toBeNull();
  });
});

describe("investmentFields", () => {
  it("keeps the last coin price while the amount held is the same", () => {
    const same = investmentFields(initialInvestmentForm(coins, TODAY), coins, DEFAULT_STATE.settings, NOW);
    expect(same).toMatchObject({ marketValue: 30000, pricedAt: coins.pricedAt });
    const more = investmentFields(
      { ...initialInvestmentForm(coins, TODAY), quantity: "1" },
      coins,
      DEFAULT_STATE.settings,
      NOW,
    );
    expect(more.marketValue).toBe(20000);
  });

  it("values a market position at what was typed, or at what was paid", () => {
    expect(
      investmentFields(form({ kind: "stocks", marketValue: "1500" }), undefined, DEFAULT_STATE.settings, NOW),
    ).toMatchObject({
      marketValue: 1500,
      annualRatePct: 10,
    });
    expect(investmentFields(form({ kind: "stocks", rate: "" }), undefined, DEFAULT_STATE.settings, NOW)).toMatchObject({
      marketValue: 1000,
      annualRatePct: 0,
    });
  });
});

describe("saveInvestment and removeInvestment", () => {
  it("adds a position, changes it in place and removes it", () => {
    const added = saveInvestment(DEFAULT_STATE, form({ contribution: "200" }), () => "new", NOW);
    expect(added.investments).toEqual([expect.objectContaining({ id: "new", monthlyContribution: 200 })]);
    const state: AppState = added;
    const changed = saveInvestment(state, { ...form({ name: "Renamed" }), id: "new" }, () => "unused", NOW);
    expect(changed.investments.map((inv) => [inv.id, inv.name])).toEqual([["new", "Renamed"]]);
    expect(removeInvestment(changed, "new").investments).toEqual([]);
  });
});
