import { describe, expect, it, vi } from "vitest";

import { clientAddress, deviceLabel } from "@/shared/lib/device";

describe("deviceLabel", () => {
  it("names the browser and the system", () => {
    expect(
      deviceLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome · Windows");
    expect(
      deviceLabel(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari · iPhone");
    expect(
      deviceLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
      ),
    ).toBe("Edge · Windows");
    expect(deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:131.0) Gecko/20100101 Firefox/131.0")).toBe(
      "Firefox · macOS",
    );
    expect(
      deviceLabel(
        "Mozilla/5.0 (Linux; Android 15; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe("Samsung Internet · Android");
    expect(
      deviceLabel(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Chrome · iPhone");
  });

  it("says what it can and nothing when it cannot", () => {
    expect(deviceLabel("curl/8.9.1")).toBe("");
    expect(deviceLabel(null)).toBe("");
  });
});

describe("clientAddress", () => {
  it("takes the address the proxy added, never one the visitor sent", () => {
    expect(clientAddress("203.0.113.7, 198.51.100.9", "10.0.0.2")).toBe("198.51.100.9");
    expect(clientAddress("198.51.100.9", null)).toBe("198.51.100.9");
    expect(clientAddress(null, "198.51.100.4")).toBe("198.51.100.4");
    expect(clientAddress("", null)).toBe("");
  });

  it("counts back as many proxies as are trusted", () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
    expect(clientAddress("1.1.1.1, 203.0.113.7, 10.0.0.1", null)).toBe("203.0.113.7");
    expect(clientAddress("203.0.113.7", null)).toBe("203.0.113.7");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "zero");
    expect(clientAddress("1.1.1.1, 203.0.113.7", null)).toBe("203.0.113.7");
  });
});
