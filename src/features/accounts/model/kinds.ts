import type { AccountKind, DebtKind } from "@/features/data/model/types";

export interface AccountKindInfo {
  value: AccountKind;
  icon: string;
}

// Every kind of account, in the order pickers and lists show them
export const ACCOUNT_KINDS: AccountKindInfo[] = [
  { value: "card", icon: "💳" },
  { value: "cash", icon: "💵" },
  { value: "savings", icon: "🏦" },
  { value: "wallet", icon: "📲" },
  { value: "crypto", icon: "🪙" },
  { value: "skins", icon: "🎮" },
  { value: "other", icon: "📦" },
];

const ACCOUNT_KIND_BY_VALUE = new Map(ACCOUNT_KINDS.map((kind) => [kind.value, kind]));

// The series colour of each kind of account
const ACCOUNT_SLOT: Record<AccountKind, number> = {
  card: 1,
  cash: 2,
  savings: 3,
  wallet: 4,
  other: 5,
  skins: 6,
  crypto: 11,
};

// The series colour of each kind of debt
const DEBT_SLOT: Record<DebtKind, number> = {
  mortgage: 13,
  loan: 5,
  card: 3,
};

// A kind of account with its icon, or a card for an unknown one
export const accountKind = (kind: AccountKind): AccountKindInfo =>
  ACCOUNT_KIND_BY_VALUE.get(kind) ?? { value: "card", icon: "💳" };

// The series colour that marks a kind of account in charts
export const accountColorSlot = (kind: AccountKind): number => ACCOUNT_SLOT[kind];

// The series colour that marks a kind of debt in charts
export const debtColorSlot = (kind: DebtKind): number => DEBT_SLOT[kind];

// Every kind of debt, in the order the picker shows them
export const DEBT_KINDS: DebtKind[] = ["mortgage", "loan", "card"];

// The icon of each kind of debt
export const DEBT_KIND_ICON: Record<DebtKind, string> = {
  mortgage: "🏠",
  loan: "🏦",
  card: "💳",
};
