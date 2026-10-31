import { afterEach, describe, expect, it, vi } from "vitest";

import { INZHUR_FUNDS } from "@/features/investments/model/inzhur";

import {
  actualYield,
  cachedQuotes,
  extractNav,
  pageText,
  parseUaNumber,
  projectedYield,
  quoteFromPage,
} from "./inzhurSite";

const fund = INZHUR_FUNDS[0]!;

// A fund page with its NAV, a projected range in dollars and a paid yield
const PAGE = `<html><head><style>.a{}</style><script>var x = "9";</script></head><body>
<dl><dd class="v">1 234,56 ₴</dd><dt>ВЧА на 1 сертифікат</dt></dl>
<p>Прогнозована дохідність фонду 11\u201312% у доларах США, за умовами договору на рік</p>
<p>10,5% фактична дохідність фонду</p></body></html>`;

describe("inzhurSite", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads Ukrainian numbers", () => {
    expect(parseUaNumber("1\u00a0234,56 ₴")).toBe(1234.56);
    expect(parseUaNumber("0")).toBeNull();
    expect(parseUaNumber("abc")).toBeNull();
  });

  it("finds the NAV on the rendered page or in its data", () => {
    expect(extractNav(PAGE)).toBe(1234.56);
    expect(extractNav('{"x":"bad","value":"1 050,25","certificateNetAssetPrice":1}')).toBe(1050.25);
    expect(extractNav("<p>nothing</p>")).toBeNull();
  });

  it("reads the yields next to their labels", () => {
    const text = pageText(PAGE);
    expect(text).not.toContain("<");
    expect(text).not.toContain("var x");
    expect(projectedYield(text)).toEqual({ min: 11, max: 12, currency: "USD" });
    expect(actualYield(text)).toEqual({ min: 10.5 });
    expect(projectedYield("no yields here")).toBeNull();
  });

  it("makes a quote, with the fund's own yields where the page has none", () => {
    expect(quoteFromPage(fund, PAGE)).toMatchObject({ id: fund.id, navPerCertificate: 1234.56, projectedYieldPct: 11 });
    const bare = quoteFromPage(fund, "<dd>500</dd><dt>ВЧА на сертифікат</dt>");
    expect(bare).toMatchObject({ projectedYieldPct: fund.projectedYieldPct, projectedCurrency: fund.linkedCurrency });
    expect(bare).not.toHaveProperty("actualYieldPct");
    expect(quoteFromPage(fund, "<p>down</p>")).toBeNull();
  });

  it("keeps the quotes for ten minutes", async () => {
    const fetchPage = vi.fn<typeof fetch>(() => Promise.resolve(new Response(PAGE)));
    vi.stubGlobal("fetch", fetchPage);
    const first = await cachedQuotes(1_000_000);
    expect(first?.quotes.size).toBe(INZHUR_FUNDS.length);
    await cachedQuotes(1_000_000 + 60_000);
    expect(fetchPage).toHaveBeenCalledTimes(INZHUR_FUNDS.length);
    fetchPage.mockResolvedValue(new Response("down", { status: 503 }));
    const later = await cachedQuotes(1_000_000 + 11 * 60_000);
    expect(later?.quotes.size).toBe(INZHUR_FUNDS.length);
  });
});
