import { describe, expect, it } from "vitest";

import { GET, generateStaticParams } from "./route";

const request = new Request("http://localhost/flags/UA");

describe("GET /flags/[code]", () => {
  it("prerenders a flag for every country", () => {
    const codes = generateStaticParams().map(({ code }) => code);
    expect(codes).toContain("UA");
    expect(codes.length).toBeGreaterThan(200);
  });

  it("serves the flag as an SVG image", async () => {
    const response = await GET(request, { params: Promise.resolve({ code: "UA" }) });
    expect(response.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    await expect(response.text()).resolves.toMatch(/^<svg/u);
  });

  it("answers unknown codes with 404", async () => {
    const response = await GET(request, { params: Promise.resolve({ code: "XX" }) });
    expect(response.status).toBe(404);
  });
});
