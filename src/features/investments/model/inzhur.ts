import type { MessageKey } from "@/shared/i18n/messages/en";

export type InzhurIncome = "dividends" | "growth";

export interface InzhurFund {
  id: string;
  slug: string;
  name: string;
  themeKey: MessageKey;
  accent: string;
  income: InzhurIncome;
  linkedCurrency: "USD" | "UAH";
  projectedYieldPct: number;
  projectedYieldMaxPct?: number;
}

// The Inzhur funds a position can hold, with the yields their pages publish
export const INZHUR_FUNDS: InzhurFund[] = [
  {
    id: "inzhur-reit",
    slug: "inzhur-reit",
    name: "Inzhur REIT",
    themeKey: "inzhur.theme.realEstate",
    accent: "#1f6feb",
    income: "dividends",
    linkedCurrency: "USD",
    projectedYieldPct: 9.5,
  },
  {
    id: "inzhur-energy",
    slug: "inzhur-energy",
    name: "Inzhur Energy",
    themeKey: "inzhur.theme.energy",
    accent: "#f0b429",
    income: "growth",
    linkedCurrency: "USD",
    projectedYieldPct: 15,
  },
  {
    id: "inzhur-miltech",
    slug: "inzhur-miltech",
    name: "Inzhur MilTech",
    themeKey: "inzhur.theme.defence",
    accent: "#9c5b3a",
    income: "growth",
    linkedCurrency: "UAH",
    projectedYieldPct: 25,
    projectedYieldMaxPct: 29,
  },
];

// The funds by their ids
const FUND_BY_ID = new Map(INZHUR_FUNDS.map((fund) => [fund.id, fund]));

// A supported Inzhur fund by its id
export const inzhurFund = (id: string | undefined): InzhurFund | undefined => (id ? FUND_BY_ID.get(id) : undefined);
