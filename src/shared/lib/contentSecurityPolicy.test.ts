import { describe, expect, it } from "vitest";

import { contentSecurityPolicy } from "./contentSecurityPolicy";

describe("contentSecurityPolicy", () => {
  it("allows only scripts with the nonce in production", () => {
    const policy = contentSecurityPolicy("abc", true);
    expect(policy).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic';");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toContain("ws:");
    // Safari would upgrade a self-hosted server on plain HTTP and break it
    expect(policy).not.toContain("upgrade-insecure-requests");
  });

  it("lets development evaluate code and reload over a socket", () => {
    const policy = contentSecurityPolicy("abc", false);
    expect(policy).toContain("'strict-dynamic' 'unsafe-eval'");
    expect(policy).toContain("ws: http://localhost:*");
  });
});
