import type { MessageKey } from "@/shared/i18n/messages/en";

export type BrandGroup = "ua-bank" | "fintech" | "crypto";

type LogoProvider = "ddg" | "goo" | "horse";

export interface Brand {
  id: string;
  name: string;
  domain: string;
  group: BrandGroup;
  color: string;
  preferred: LogoProvider;
}

export const BRANDS: Brand[] = [
  { id: "monobank", name: "Monobank", domain: "monobank.ua", group: "ua-bank", color: "#000000", preferred: "ddg" },
  { id: "privatbank", name: "PrivatBank", domain: "privat24.ua", group: "ua-bank", color: "#6cb33f", preferred: "ddg" },
  {
    id: "oschadbank",
    name: "Oschadbank",
    domain: "oschadbank.ua",
    group: "ua-bank",
    color: "#00a651",
    preferred: "horse",
  },
  { id: "pumb", name: "PUMB", domain: "pumb.ua", group: "ua-bank", color: "#e4002b", preferred: "ddg" },
  {
    id: "raiffeisen",
    name: "Raiffeisen Bank",
    domain: "raiffeisen.ua",
    group: "ua-bank",
    color: "#ffe000",
    preferred: "ddg",
  },
  {
    id: "sensebank",
    name: "Sense Bank",
    domain: "sensebank.ua",
    group: "ua-bank",
    color: "#ff4713",
    preferred: "horse",
  },
  { id: "abank", name: "A-Bank", domain: "abank.ua", group: "ua-bank", color: "#e30613", preferred: "goo" },
  { id: "otp", name: "OTP Bank", domain: "otpbank.com.ua", group: "ua-bank", color: "#52ae30", preferred: "horse" },
  {
    id: "ukrsib",
    name: "UKRSIBBANK",
    domain: "ukrsibbank.com",
    group: "ua-bank",
    color: "#00847d",
    preferred: "horse",
  },
  {
    id: "ukrgasbank",
    name: "Ukrgasbank",
    domain: "ukrgasbank.com",
    group: "ua-bank",
    color: "#005baa",
    preferred: "goo",
  },
  { id: "izibank", name: "izibank", domain: "izibank.com.ua", group: "ua-bank", color: "#1e1e1e", preferred: "horse" },

  { id: "wise", name: "Wise", domain: "wise.com", group: "fintech", color: "#9fe870", preferred: "horse" },
  { id: "revolut", name: "Revolut", domain: "revolut.com", group: "fintech", color: "#0066ff", preferred: "goo" },
  { id: "paypal", name: "PayPal", domain: "paypal.com", group: "fintech", color: "#003087", preferred: "horse" },
  { id: "payoneer", name: "Payoneer", domain: "payoneer.com", group: "fintech", color: "#ff4800", preferred: "horse" },

  { id: "whitebit", name: "WhiteBIT", domain: "whitebit.com", group: "crypto", color: "#1a6dff", preferred: "horse" },
  { id: "binance", name: "Binance", domain: "binance.com", group: "crypto", color: "#f0b90b", preferred: "ddg" },
  { id: "bybit", name: "Bybit", domain: "bybit.com", group: "crypto", color: "#f7a600", preferred: "ddg" },
  { id: "okx", name: "OKX", domain: "okx.com", group: "crypto", color: "#000000", preferred: "ddg" },
];

const BY_ID = new Map(BRANDS.map((b) => [b.id, b]));

export const BRAND_GROUP_ORDER: BrandGroup[] = ["ua-bank", "fintech", "crypto"];

export const BRAND_GROUP_LABEL_KEY: Record<BrandGroup, MessageKey> = {
  "ua-bank": "brand.group.uaBank",
  fintech: "brand.group.fintech",
  crypto: "brand.group.crypto",
};

// A brand by its id
export const brandInfo = (id: string | undefined): Brand | undefined => (id ? BY_ID.get(id) : undefined);

// A favicon service's address for a domain
const providerUrl = (provider: LogoProvider, domain: string): string => {
  switch (provider) {
    case "ddg":
      return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    case "goo":
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    case "horse":
      return `https://icon.horse/icon/${domain}`;
  }
};

// The favicon services, in the order they are tried
const PROVIDERS: LogoProvider[] = ["ddg", "goo", "horse"];

// A brand's logo: the bundled picture, then the favicon services
export const brandLogoSources = (id: string | undefined): string[] => {
  const brand = brandInfo(id);
  if (!brand) return [];
  const order = [brand.preferred, ...PROVIDERS.filter((provider) => provider !== brand.preferred)];
  return [`/brands/${brand.id}.png`, ...order.map((provider) => providerUrl(provider, brand.domain))];
};

export const INZHUR_LOGO = "/brands/inzhur.png";

export const BANKABLE_KINDS = new Set(["card", "savings", "wallet", "crypto"]);
