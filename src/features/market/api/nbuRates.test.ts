import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchDayRate, fetchMonthRates } from "./nbuRates";

// A fetch that answers every request with the next of these replies
const answer = (...replies: (Response | Error)[]) => {
  const fetchMock = vi.fn<typeof fetch>();
  for (const reply of replies) {
    if (reply instanceof Error) fetchMock.mockRejectedValueOnce(reply);
    else fetchMock.mockResolvedValueOnce(reply);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("NBU rates", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads month after month until the bank stops answering", async () => {
    const fetchMock = answer(
      Response.json({ USD: 41.2, EUR: 44.8 }),
      Response.json({ USD: 41.5 }),
      new Response(null, { status: 502 }),
    );
    await expect(fetchMonthRates(["2026-07", "2026-08", "2026-09", "2026-10"])).resolves.toEqual({
      "2026-07": { USD: 41.2, EUR: 44.8 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenCalledWith("/api/nbu-rate?month=2026-07");
  });

  it("gives the rate of a day, or null without one", async () => {
    answer(Response.json({ rate: 41.37 }), new Response(null, { status: 404 }), new Error("Offline"));
    await expect(fetchDayRate("USD", "2026-10-01")).resolves.toBe(41.37);
    await expect(fetchDayRate("USD", "2026-12-01")).resolves.toBeNull();
    await expect(fetchDayRate("EUR", "2026-10-01")).resolves.toBeNull();
  });

  it("stops at an answer that is not JSON or a broken rate", async () => {
    answer(new Response("not json"), Response.json({ USD: 0, EUR: 45 }), new Error("offline"));
    await expect(fetchMonthRates(["2026-07", "2026-08", "2026-09"])).resolves.toEqual({});
    answer(new Error("offline"));
    await expect(fetchDayRate("USD", "2026-10-01")).resolves.toBeNull();
    answer(new Response("not json"));
    await expect(fetchDayRate("USD", "2026-10-01")).resolves.toBeNull();
  });
});
