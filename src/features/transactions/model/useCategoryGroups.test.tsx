import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { DEFAULT_CATEGORIES } from "@/features/data/model/defaults";
import I18nProvider from "@/shared/i18n/I18nProvider";
import { en } from "@/shared/i18n/messages/en";

import { useCategoryGroups } from "./useCategoryGroups";

// English translations around the hook
const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider locale="en" messages={en}>
    {children}
  </I18nProvider>
);

describe("useCategoryGroups", () => {
  it("lists parents with their subcategories, one group per kind", () => {
    const { result } = renderHook(() => useCategoryGroups(DEFAULT_CATEGORIES, ["expense", "income"]), { wrapper });
    const [expense, income] = result.current;
    expect(expense?.label).toBe("Expense");
    expect(income?.label).toBe("Income");
    const housing = expense?.items.find((item) => item.value === "cat-housing");
    expect(housing).toMatchObject({ label: "Housing", hint: "general" });
    expect(expense?.items.find((item) => item.value === "cat-rent")).toMatchObject({ child: true });
  });

  it("puts lead items first and names no group for a single kind", () => {
    const lead = [{ value: "", label: "All categories" }];
    const { result } = renderHook(() => useCategoryGroups(DEFAULT_CATEGORIES, ["income"], lead), { wrapper });
    expect(result.current[0]?.items).toEqual(lead);
    expect(result.current[1]?.label).toBeUndefined();
  });

  it("leaves out a kind without categories", () => {
    const { result } = renderHook(() => useCategoryGroups([], ["expense"]), { wrapper });
    expect(result.current).toEqual([]);
  });
});
