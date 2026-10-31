import { describe, expect, it } from "vitest";

import { isRecord, readArray, readNumber, readRecord, readString, readStrings, readText } from "./guards";

describe("guards", () => {
  const source = { count: 3, infinite: Infinity, name: "  Lviv ", blank: " ", list: [1], nested: { ok: true } };

  it("recognises plain records only", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord("text")).toBe(false);
  });

  it("reads finite numbers", () => {
    expect(readNumber(source, "count")).toBe(3);
    expect(readNumber(source, "infinite")).toBeNull();
    expect(readNumber(source, "name")).toBeNull();
    expect(readNumber(null, "count")).toBeNull();
  });

  it("reads trimmed non-empty strings", () => {
    expect(readString(source, "name")).toBe("Lviv");
    expect(readString(source, "blank")).toBeNull();
    expect(readString(source, "count")).toBeNull();
  });

  it("reads text as stored and the text items of lists", () => {
    expect(readText(source, "blank")).toBe(" ");
    expect(readText(source, "count")).toBeNull();
    expect(readStrings({ codes: ["a", 1, "b"] }, "codes")).toEqual(["a", "b"]);
    expect(readStrings(source, "name")).toEqual([]);
  });

  it("reads arrays and nested records", () => {
    expect(readArray(source, "list")).toEqual([1]);
    expect(readArray(source, "nested")).toEqual([]);
    expect(readRecord(source, "nested")).toEqual({ ok: true });
    expect(readRecord(source, "list")).toBeNull();
  });
});
