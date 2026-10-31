import { beforeEach, describe, expect, it, vi } from "vitest";

import { dayRate, kyivDay, kyivMonth, monthAverages } from "./nbuBank";

const fetchMock = vi.fn<typeof fetch>();

// The address a fetch call was given
const urlOf = (input: unknown): string => (typeof input === "string" ? input : "");

// The bank's answer as JSON
const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("nbuBank", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("names the month in Kyiv", () => {
    expect(kyivMonth(new Date("2026-09-30T21:30:00Z"))).toBe("2026-10");
    expect(kyivMonth(new Date("2026-09-30T20:30:00Z"))).toBe("2026-09");
    expect(kyivDay(new Date("2026-10-29T22:30:00Z"))).toBe("2026-10-30");
  });

  it("averages a month of both currencies once", async () => {
    fetchMock.mockImplementation((url) =>
      Promise.resolve(
        urlOf(url).includes("valcode=usd")
          ? answer([{ rate_per_unit: 41 }, { rate_per_unit: 42 }])
          : answer([{ rate: 45.5 }]),
      ),
    );
    await expect(monthAverages("2026-02")).resolves.toEqual({ USD: 41.5, EUR: 45.5 });
    expect(urlOf(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://bank.gov.ua/NBU_Exchange/exchange_site?start=20260201&end=20260228&valcode=usd&sort=exchangedate&order=asc&json",
    );
    await expect(monthAverages("2026-02")).resolves.toEqual({ USD: 41.5, EUR: 45.5 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives no averages unless the bank has both", async () => {
    fetchMock.mockImplementation((url) =>
      Promise.resolve(urlOf(url).includes("valcode=usd") ? answer([{ rate: 41 }]) : answer({}, 500)),
    );
    await expect(monthAverages("2026-03")).resolves.toBeNull();
    fetchMock.mockImplementation(() => Promise.resolve(answer([])));
    await expect(monthAverages("2026-04")).resolves.toBeNull();
  });

  it("reads a day's rate once and nothing from a bad answer", async () => {
    fetchMock.mockResolvedValueOnce(answer([{ rate: 41.25 }]));
    await expect(dayRate("USD", "2026-10-01")).resolves.toBe(41.25);
    expect(urlOf(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&date=20261001&json",
    );
    await expect(dayRate("USD", "2026-10-01")).resolves.toBe(41.25);
    expect(fetchMock).toHaveBeenCalledOnce();

    fetchMock.mockResolvedValueOnce(answer([{ rate: 0 }]));
    await expect(dayRate("EUR", "2026-10-01")).resolves.toBeNull();
    fetchMock.mockResolvedValueOnce(answer({ message: "no" }));
    await expect(dayRate("EUR", "2026-10-02")).resolves.toBeNull();
    fetchMock.mockResolvedValueOnce(answer([{ rate: 45 }], 503));
    await expect(dayRate("EUR", "2026-10-03")).resolves.toBeNull();
  });
});
