import { describe, expect, it } from "vitest";

import { securityTxt } from "./securityTxt";

describe("securityTxt", () => {
  it("names the contact, the policy and an expiry a year ahead", () => {
    const text = securityTxt(
      "https://github.com/sacrificed666/app",
      new URL("https://app.example"),
      Date.UTC(2026, 9, 10),
    );
    expect(text.split("\n")).toEqual([
      "Contact: https://github.com/sacrificed666/app/security/advisories/new",
      "Expires: 2027-10-10T00:00:00.000Z",
      "Preferred-Languages: en, uk",
      "Canonical: https://app.example/.well-known/security.txt",
      "Policy: https://github.com/sacrificed666/app/security/policy",
      "",
    ]);
  });
});
