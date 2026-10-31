import { describe, expect, it } from "vitest";

import packageJson from "../../../package.json" with { type: "json" };
import { SITE, siteUrl } from "./site";

describe("SITE", () => {
  it("names the author, the repository and the version of the package", () => {
    expect(SITE.version).toBe(packageJson.version);
    expect(SITE.changelog.startsWith(SITE.repository)).toBe(true);
    expect(SITE.author.name).toBe("Illia Movchko");
  });
});

describe("siteUrl", () => {
  it("takes AUTH_URL, or localhost on the port", () => {
    expect(siteUrl({ AUTH_URL: " https://money.example " }).href).toBe("https://money.example/");
    expect(siteUrl({ PORT: "4000" }).href).toBe("http://localhost:4000/");
    expect(siteUrl({}).href).toBe("http://localhost:3000/");
  });
});
