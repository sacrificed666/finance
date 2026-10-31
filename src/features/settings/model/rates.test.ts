import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";

import { setManualRate } from "./rates";

describe("setManualRate", () => {
  it("keeps a rate typed by hand and marks the source as manual", () => {
    const next = setManualRate(DEFAULT_STATE, "USD", 42, "2026-10-10T12:00:00.000Z");
    expect(next.settings).toMatchObject({
      rates: { USD: 42 },
      ratesSource: "manual",
      ratesMeta: undefined,
      ratesUpdatedAt: "2026-10-10T12:00:00.000Z",
    });
  });
});
