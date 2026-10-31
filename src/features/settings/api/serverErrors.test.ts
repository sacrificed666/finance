import { afterEach, describe, expect, it, vi } from "vitest";

import { clearServerErrors, fetchServerErrors, reportClientError } from "./serverErrors";

// A fetch that answers with this reply
const answer = (reply: Response) => {
  vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(reply));
};

// A fetch that fails as an offline browser does
const offline = () => vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")));

describe("server error requests", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the log and skips malformed entries", async () => {
    answer(
      Response.json({
        total: 3,
        errors: [{ at: "2026-10-10T08:00:00Z", route: "api/state", message: "boom" }, { at: "x" }],
      }),
    );
    await expect(fetchServerErrors()).resolves.toEqual({
      total: 3,
      errors: [{ at: "2026-10-10T08:00:00Z", route: "api/state", message: "boom" }],
    });
  });

  it("says whether the log was cleared", async () => {
    answer(new Response(null, { status: 204 }));
    await expect(clearServerErrors()).resolves.toBe(true);
    answer(new Response("no", { status: 500 }));
    await expect(clearServerErrors()).resolves.toBe(false);
  });

  it("gives nothing when the server cannot be reached or answers oddly", async () => {
    offline();
    await expect(fetchServerErrors()).resolves.toBeNull();
    await expect(clearServerErrors()).resolves.toBe(false);
    answer(new Response("not json"));
    await expect(fetchServerErrors()).resolves.toEqual({ errors: [], total: 0 });
  });

  it("reports a failure of the browser with the digest the server gave it", async () => {
    answer(Response.json({ ok: true }));
    const failure = Object.assign(new TypeError("x is undefined"), { digest: "abc" });
    await reportClientError(failure, "/transactions");
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe("/api/errors");
    expect(JSON.parse(typeof init?.body === "string" ? init.body : "{}")).toEqual({
      page: "/transactions",
      message: "TypeError: x is undefined",
      digest: "abc",
    });
    offline();
    await expect(reportClientError("odd", "/")).resolves.toBeUndefined();
  });
});
