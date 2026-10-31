import { ICON_CHOICES } from "@/features/data/model/defaults";
import type { AccountKind, AppState, CoinHolding, SavingsAccount } from "@/features/data/model/types";
import type { MessageParams } from "@/shared/i18n/translate";
import { parseAmount, type Currency } from "@/shared/lib/money";

import { BANKABLE_KINDS, brandInfo } from "./brands";
import { COINS, coinInfo } from "./coins";
import { CUSTOM_GAME_ID, GAMES } from "./games";
import { holdingDrafts, type HoldingDraft } from "./holdings";

export interface AccountForm {
  id: string | null;
  name: string;
  icon: string;
  kind: AccountKind;
  game: string;
  gameName: string;
  gameLogo: string;
  bank: string;
  currency: Currency;
  openingBalance: string;
  holdings: HoldingDraft[];
  pricedAt: string | null;
  goalEnabled: boolean;
  target: string;
  deadline: string;
  creditEnabled: boolean;
  creditLimit: string;
}

// An address a custom game logo may come from
const HTTPS_URL = /^https:\/\/\S{3,480}$/u;
// The icon a new account starts with
const FIRST_ICON = ICON_CHOICES[0] ?? "💳";
// The game a skins account starts with
const FIRST_GAME = GAMES[0]?.id ?? CUSTOM_GAME_ID;

// The form of a new account, or of a stored one
export const initialAccountForm = (target: SavingsAccount | "new", makeKey: () => string): AccountForm => {
  if (target === "new") {
    return {
      id: null,
      name: "",
      icon: FIRST_ICON,
      kind: "card",
      game: FIRST_GAME,
      gameName: "",
      gameLogo: "",
      bank: "",
      currency: "UAH",
      openingBalance: "",
      holdings: [],
      pricedAt: null,
      goalEnabled: false,
      target: "",
      deadline: "",
      creditEnabled: false,
      creditLimit: "",
    };
  }
  return {
    id: target.id,
    name: target.name,
    icon: target.icon,
    kind: target.kind,
    game: target.game ?? FIRST_GAME,
    gameName: target.gameName ?? "",
    gameLogo: target.gameLogo ?? "",
    bank: target.bank ?? "",
    currency: target.currency,
    openingBalance: String(target.openingBalance),
    holdings: holdingDrafts(target.holdings, makeKey),
    pricedAt: target.pricedAt ?? null,
    goalEnabled: target.goal !== undefined,
    target: target.goal ? String(target.goal.target) : "",
    deadline: target.goal?.deadline ?? "",
    creditEnabled: target.credit !== undefined,
    creditLimit: target.credit && target.credit.limit > 0 ? String(target.credit.limit) : "",
  };
};

// The form as another kind; a crypto wallet starts in dollars with one coin
export const switchAccountKind = (form: AccountForm, kind: AccountKind, makeKey: () => string): AccountForm => {
  const toCrypto = kind === "crypto" && form.kind !== "crypto";
  const firstCoin = COINS[0]?.id;
  return {
    ...form,
    kind,
    icon: toCrypto && form.icon === FIRST_ICON ? "🪙" : form.icon,
    currency: toCrypto && form.currency === "UAH" ? "USD" : form.currency,
    bank: kind === "crypto" && brandInfo(form.bank)?.group === "ua-bank" ? "" : form.bank,
    holdings:
      toCrypto && form.holdings.length === 0 && firstCoin
        ? [{ key: makeKey(), coin: firstCoin, quantity: "" }]
        : form.holdings,
  };
};

// The form with one more coin, the first one not held yet
export const addHolding = (form: AccountForm, makeKey: () => string): AccountForm => {
  const held = new Set(form.holdings.map((holding) => holding.coin));
  const next = COINS.find((coin) => !held.has(coin.id));
  return next ? { ...form, holdings: [...form.holdings, { key: makeKey(), coin: next.id, quantity: "" }] } : form;
};

// The opening balance typed, an empty field counting as zero
const openingOf = (form: AccountForm) => parseAmount(form.openingBalance.trim() === "" ? "0" : form.openingBalance);

export interface AccountProblem {
  key:
    | "balance.acc.problem.name"
    | "balance.acc.problem.opening"
    | "balance.crypto.problem.amount"
    | "balance.acc.problem.gameName"
    | "balance.acc.problem.gameLogo"
    | "balance.acc.problem.goal"
    | "balance.acc.problem.credit";
  params?: MessageParams;
}

// What stops the account from being saved, the first problem only, or null
export const accountProblem = (form: AccountForm): AccountProblem | null => {
  if (!form.name.trim()) return { key: "balance.acc.problem.name" };
  if (!Number.isFinite(openingOf(form))) return { key: "balance.acc.problem.opening" };
  if (form.kind === "crypto") {
    const bad = form.holdings.find((holding) => {
      const quantity = parseAmount(holding.quantity);
      return !Number.isFinite(quantity) || quantity <= 0;
    });
    if (bad) return { key: "balance.crypto.problem.amount", params: { coin: coinInfo(bad.coin)?.symbol ?? bad.coin } };
  }
  if (form.kind === "skins" && form.game === CUSTOM_GAME_ID) {
    if (!form.gameName.trim()) return { key: "balance.acc.problem.gameName" };
    if (form.gameLogo.trim() && !HTTPS_URL.test(form.gameLogo.trim())) return { key: "balance.acc.problem.gameLogo" };
  }
  if (form.goalEnabled) {
    const target = parseAmount(form.target);
    if (!Number.isFinite(target) || target <= 0) return { key: "balance.acc.problem.goal" };
  }
  if (form.kind === "card" && form.creditEnabled && form.creditLimit.trim() !== "") {
    const limit = parseAmount(form.creditLimit);
    if (!Number.isFinite(limit) || limit < 0) return { key: "balance.acc.problem.credit" };
  }
  return null;
};

// The stored fields of the account the form describes
export const accountFields = (form: AccountForm): Omit<SavingsAccount, "id"> => {
  const crypto = form.kind === "crypto";
  const skins = form.kind === "skins";
  const custom = skins && form.game === CUSTOM_GAME_ID;
  const holdings: CoinHolding[] = crypto
    ? form.holdings.map((holding) => ({
        coin: holding.coin,
        quantity: parseAmount(holding.quantity),
        price: holding.price,
        icon: holding.icon,
      }))
    : [];
  return {
    name: form.name.trim(),
    icon: form.icon,
    kind: form.kind,
    game: skins ? form.game : undefined,
    gameName: custom ? form.gameName.trim() : undefined,
    gameLogo: custom && form.gameLogo.trim() ? form.gameLogo.trim() : undefined,
    bank: BANKABLE_KINDS.has(form.kind) && form.bank ? form.bank : undefined,
    currency: form.currency,
    openingBalance: openingOf(form),
    holdings: holdings.length > 0 ? holdings : undefined,
    pricedAt: crypto ? (form.pricedAt ?? undefined) : undefined,
    goal: form.goalEnabled ? { target: parseAmount(form.target), deadline: form.deadline || undefined } : undefined,
    credit:
      form.kind === "card" && form.creditEnabled
        ? { limit: form.creditLimit.trim() === "" ? 0 : parseAmount(form.creditLimit) }
        : undefined,
  };
};

// The accounts with the form's account changed in place or added
export const saveAccount = (state: AppState, form: AccountForm, makeId: () => string): AppState => {
  const fields = accountFields(form);
  const id = form.id;
  return {
    ...state,
    savings: id
      ? state.savings.map((account) => (account.id === id ? { ...account, ...fields } : account))
      : [...state.savings, { id: makeId(), ...fields }],
  };
};
