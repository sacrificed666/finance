import { describe, expect, it } from "vitest";

import { icsCalendar } from "./ics";

describe("icsCalendar", () => {
  it("writes whole-day events with escaped text and CRLF lines", () => {
    const text = icsCalendar(
      "Finance",
      [{ uid: "a@finance", date: "2026-11-05", title: "Rent; flat, 15,000 ₴" }],
      new Date("2026-10-31T12:00:00Z"),
    );
    expect(text.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(text).toContain("DTSTART;VALUE=DATE:20261105\r\nDTEND;VALUE=DATE:20261106\r\n");
    expect(text).toContain("SUMMARY:Rent\\; flat\\, 15\\,000 ₴\r\n");
    expect(text).toContain("DTSTAMP:20261031T120000Z");
    expect(text.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("folds long lines at 75 bytes without splitting a letter", () => {
    const title = "Оренда квартири на Подолі за листопад, разом із комунальними платежами";
    const text = icsCalendar("Finance", [{ uid: "b", date: "2026-12-31", title }], new Date(0));
    const lines = text.split("\r\n");
    const start = lines.findIndex((line) => line.startsWith("SUMMARY:"));
    expect(lines[start + 1]?.startsWith(" ")).toBe(true);
    expect(lines.every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
    const joined = [lines[start], ...lines.slice(start + 1).filter((line) => line.startsWith(" "))]
      .map((line, index) => (index === 0 ? line : line?.slice(1)))
      .join("");
    expect(joined).toBe(`SUMMARY:${title.replaceAll(",", "\\,")}`);
    expect(icsCalendar("A", [], new Date(0))).not.toContain("BEGIN:VEVENT");
  });
});
