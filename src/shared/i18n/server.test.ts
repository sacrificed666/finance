import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.hoisted(() => ({ cookie: "", language: "" }));

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: () => (request.cookie === "" ? undefined : { value: request.cookie }) }),
  headers: () => Promise.resolve(new Headers(request.language === "" ? {} : { "accept-language": request.language })),
}));

const { requestLocale, serverMessages, serverT, titled } = await import("./server");

describe("server i18n", () => {
  beforeEach(() => {
    request.cookie = "";
    request.language = "";
  });

  it("takes the cookie's language, then the browser's, then English", async () => {
    request.cookie = "pl";
    await expect(requestLocale()).resolves.toBe("pl");
    request.cookie = "xx";
    request.language = "de-AT,de;q=0.9,en;q=0.5";
    await expect(requestLocale()).resolves.toBe("de");
    request.language = "";
    await expect(requestLocale()).resolves.toBe("en");
  });

  it("translates for metadata with English for a missing key", async () => {
    expect(serverT("uk")("app.name")).toBe(serverMessages("uk")["app.name"]);
    const thin = serverMessages("cs");
    const kept = thin["nav.reports"];
    delete thin["nav.reports"];
    expect(serverT("cs")("nav.reports")).toBe(serverMessages("en")["nav.reports"]);
    if (kept !== undefined) thin["nav.reports"] = kept;
    request.cookie = "fr";
    await expect(titled("nav.reports")()).resolves.toEqual({ title: serverMessages("fr")["nav.reports"] });
  });
});
