import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

vi.mock("next/server", () => ({ connection: async () => {} }));

describe("GET /.well-known/security.txt", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("points to private advisories for a year and caches for a day", async () => {
    vi.stubEnv("AUTH_URL", "https://money.example");
    const response = await GET();
    const text = await response.text();
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(text).toMatch(/^Contact: https:\/\/github\.com\/sacrificed666\/finance\/security\/advisories\/new$/mu);
    expect(text).toContain("Canonical: https://money.example/.well-known/security.txt");
    const expires = Date.parse(/^Expires: (?<date>.+)$/mu.exec(text)?.groups?.date ?? "");
    expect(expires).toBeGreaterThan(Date.now() + 360 * 24 * 60 * 60 * 1000);
  });
});
