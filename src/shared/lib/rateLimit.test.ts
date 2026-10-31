import { afterEach, describe, expect, it, vi } from "vitest";

import { clientKey, rateLimit } from "./rateLimit";

describe("rateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows hits up to the limit in a window and says when to come back", () => {
    vi.useFakeTimers({ now: 1_000_000, toFake: ["Date"] });
    expect(rateLimit("limit-a", 2, 60_000)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(rateLimit("limit-a", 2, 60_000).allowed).toBe(true);
    expect(rateLimit("limit-a", 2, 60_000)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    vi.setSystemTime(1_000_000 + 60_001);
    expect(rateLimit("limit-a", 2, 60_000).allowed).toBe(true);
  });

  it("forgets ended windows once many keys are tracked", () => {
    vi.useFakeTimers({ now: 5_000_000, toFake: ["Date"] });
    for (let i = 0; i < 600; i++) rateLimit(`sweep-${String(i)}`, 1, 1000);
    vi.setSystemTime(5_000_000 + 2000);
    expect(rateLimit("sweep-0", 1, 1000).allowed).toBe(true);
  });
});

// A request with these headers
const request = (headers: Record<string, string>) => new Request("http://localhost/", { headers });

describe("clientKey", () => {
  it("keys by the address the proxy added, the real one, or local", () => {
    expect(clientKey(request({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }), "signin")).toBe("signin:10.0.0.1");
    expect(clientKey(request({ "x-real-ip": "198.51.100.4" }), "signin")).toBe("signin:198.51.100.4");
    expect(clientKey(request({}), "signin")).toBe("signin:local");
  });
});
