import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import I18nProvider from "@/shared/i18n/I18nProvider";
import { en } from "@/shared/i18n/messages/en";

import { useAccountGroups } from "./useAccountGroups";

// English translations around the hook
const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider locale="en" messages={en}>
    {children}
  </I18nProvider>
);

describe("useAccountGroups", () => {
  it("lists the accounts with their kind and currency after the lead items", () => {
    const accounts = [
      {
        id: "card",
        name: "Mono Black",
        icon: "💳",
        kind: "card" as const,
        currency: "UAH" as const,
        openingBalance: 0,
      },
    ];
    const lead = [{ value: "", label: "All accounts" }];
    const { result } = renderHook(() => useAccountGroups(accounts, lead), { wrapper });
    expect(result.current[0]?.items).toEqual(lead);
    expect(result.current[1]?.items[0]).toMatchObject({ value: "card", label: "Mono Black", hint: "Card · UAH" });
  });

  it("is empty without accounts or lead items", () => {
    const { result } = renderHook(() => useAccountGroups([]), { wrapper });
    expect(result.current).toEqual([]);
  });
});
