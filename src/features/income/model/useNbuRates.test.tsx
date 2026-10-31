import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { fetchDayRate } from "@/features/market/api/nbuRates";

import { useNbuRates } from "./useNbuRates";

const dayRate = vi.hoisted(() => vi.fn<typeof fetchDayRate>());

vi.mock(import("@/features/market/api/nbuRates"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchDayRate: dayRate,
}));

describe("useNbuRates", () => {
  it("keeps the rates the bank had for the asked days", async () => {
    dayRate.mockImplementation((currency) => Promise.resolve(currency === "USD" ? 41.2 : null));
    const { result } = renderHook(() => useNbuRates(["USD:2026-10-01", "EUR:2026-10-01"]));
    await waitFor(() => expect(result.current.get("USD:2026-10-01")).toBe(41.2));
    expect(result.current.has("EUR:2026-10-01")).toBe(false);
    expect(dayRate).toHaveBeenCalledWith("EUR", "2026-10-01");
  });

  it("asks nothing without keys", () => {
    dayRate.mockReset();
    const { result } = renderHook(() => useNbuRates([]));
    expect(result.current.size).toBe(0);
    expect(dayRate).not.toHaveBeenCalled();
  });
});
