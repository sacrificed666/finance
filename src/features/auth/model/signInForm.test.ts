import { describe, expect, it } from "vitest";

import { emailValid, safeNext } from "./signInForm";

describe("emailValid", () => {
  it("accepts a plain address and refuses the rest", () => {
    expect(emailValid(" me@example.com ")).toBe(true);
    expect(emailValid("me@example")).toBe(false);
    expect(emailValid("me example.com")).toBe(false);
  });
});

describe("safeNext", () => {
  it("only goes back to a page of this app", () => {
    expect(safeNext("/transactions?month=2026-10")).toBe("/transactions?month=2026-10");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext("/\t/evil.example")).toBe("/");
    expect(safeNext("/\n/evil.example")).toBe("/");
    expect(safeNext("/%09/evil.example")).toBe("/%09/evil.example");
    expect(safeNext("/accounts#goals")).toBe("/accounts#goals");
  });
});
