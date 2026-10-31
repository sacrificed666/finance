import { describe, expect, it } from "vitest";

import { GET, generateStaticParams } from "./route";

// The answer of the route for a language
const load = (locale: string) =>
  GET(new Request(`http://localhost/offline/${locale}`), { params: Promise.resolve({ locale }) });

describe("GET /offline/[locale]", () => {
  it("prerenders the page in every language", () => {
    expect(generateStaticParams().map(({ locale }) => locale)).toEqual([
      "en",
      "uk",
      "cs",
      "de",
      "es",
      "fr",
      "it",
      "nl",
      "pl",
      "pt",
    ]);
  });

  it("answers with the page in its language and a policy of its own", async () => {
    const response = await load("uk");
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("content-security-policy")).toMatch(/^default-src 'none'; style-src 'sha256-/u);
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    const html = await response.text();
    expect(html).toContain('<html lang="uk">');
    expect(html).toContain("<h1>Немає з’єднання</h1>");
  });

  it("answers unknown languages with 404", async () => {
    expect((await load("xx")).status).toBe(404);
  });
});
