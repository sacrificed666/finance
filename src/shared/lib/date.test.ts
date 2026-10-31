import { describe, expect, it } from "vitest";

import { formatDateNumeric, parseDateInput } from "./date";

describe("numeric dates", () => {
  it("writes a date in numbers in the page language's order", () => {
    expect(formatDateNumeric("2026-10-28")).toBe("28/10/2026");
  });

  it("reads a typed date in ISO or in the page's order, two-digit years included", () => {
    expect(parseDateInput("2026-10-28")).toBe("2026-10-28");
    expect(parseDateInput(" 28/10/2026 ")).toBe("2026-10-28");
    expect(parseDateInput("1.2.26")).toBe("2026-02-01");
  });

  it("turns down what is no day", () => {
    expect(parseDateInput("31/02/2026")).toBeNull();
    expect(parseDateInput("28/13/2026")).toBeNull();
    expect(parseDateInput("0/10/2026")).toBeNull();
    expect(parseDateInput("28/10/202")).toBeNull();
    expect(parseDateInput("28/10/1800")).toBeNull();
    expect(parseDateInput("28/10")).toBeNull();
  });
});
