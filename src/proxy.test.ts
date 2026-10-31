import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { config, proxy } from "./proxy";

const SESSION = "authjs.session-token=abc";

// A request for the proxy
const request = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(path, "http://localhost"), { headers });

describe("proxy", () => {
  it("adds a fresh nonce-based Content Security Policy to every page", () => {
    const first = proxy(request("/income", { cookie: SESSION }));
    const second = proxy(request("/login"));
    const policy = first.headers.get("content-security-policy") ?? "";
    expect(first.status).toBe(200);
    expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/u);
    expect(policy).not.toBe(second.headers.get("content-security-policy"));
  });

  it("sends visitors without a session to sign in and back", () => {
    const response = proxy(request("/reports?year=2026"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login?next=%2Freports%3Fyear%3D2026");
    expect(proxy(request("/")).headers.get("location")).toBe("http://localhost/login");
  });

  it("takes an empty session cookie for none", () => {
    expect(proxy(request("/", { cookie: "__Secure-authjs.session-token=" })).status).toBe(307);
    expect(proxy(request("/", { cookie: `__Secure-${SESSION}` })).status).toBe(200);
  });

  it("skips API routes, static files, images and metadata files", () => {
    const [matcher] = config.matcher;
    const pattern = new RegExp(`^${matcher?.source ?? ""}$`, "u");
    const handled = ["/", "/login", "/income", "/apiary", "/flagship", "/robots.txt.bak", "/healthz-x"];
    expect(handled.filter((path) => pattern.test(path))).toEqual(handled);
    const skipped = [
      "/api/state",
      "/_next/static/x.js",
      "/icons/icon-192.png",
      "/flags/UA",
      "/brands/mono.svg",
      "/games/steam.svg",
      "/robots.txt",
      "/manifest.webmanifest",
      "/apple-icon.png",
      "/icon.svg",
      "/favicon.ico",
      "/healthz",
      "/.well-known/security.txt",
      "/sw.js",
    ];
    expect(skipped.filter((path) => pattern.test(path))).toEqual([]);
  });

  describe("with AUTH_URL on localhost", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("sends 127.0.0.1 to the address sign-in uses, and nothing else", () => {
      vi.stubEnv("AUTH_URL", "http://localhost:3000");
      const moved = proxy(request("/reports?year=2026", { host: "127.0.0.1:3000" }));
      expect(moved.status).toBe(307);
      expect(moved.headers.get("location")).toBe("http://localhost:3000/reports?year=2026");
      expect(proxy(request("/login", { host: "localhost:3000" })).status).toBe(200);
      expect(proxy(request("/login", { host: "192.168.1.5:3000" })).status).toBe(200);
      expect(proxy(request("/login", { host: "127.0.0.1:4000" })).status).toBe(200);
    });
  });
});
