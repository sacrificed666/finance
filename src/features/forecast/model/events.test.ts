import { describe, expect, it } from "vitest";

import type { PlannedEvent } from "@/features/data/model/types";

import {
  addPlannedEvent,
  blankEventDraft,
  byMonth,
  eventDraftOf,
  mergeEvents,
  parseLegacyEvents,
  savePlannedEvent,
} from "./events";

const car: PlannedEvent = { id: "car", month: "2027-03", amount: -9000, currency: "UAH", note: "Car" };

describe("addPlannedEvent", () => {
  it("adds a sum going out as a negative amount and refuses an empty one", () => {
    const draft = { ...blankEventDraft("2026-10", "USD"), amount: "500", note: " Trip " };
    expect(draft.month).toBe("2027-04");
    expect(addPlannedEvent([car], draft, () => "trip")).toEqual([
      car,
      { id: "trip", month: "2027-04", amount: -500, currency: "USD", note: "Trip" },
    ]);
    expect(addPlannedEvent([], { ...draft, sign: "in" }, () => "x")?.[0]?.amount).toBe(500);
    expect(addPlannedEvent([], { ...draft, amount: "" }, () => "x")).toBeNull();
  });
});

describe("savePlannedEvent", () => {
  it("saves a changed draft over its event, adds a new one and refuses an empty one", () => {
    const draft = eventDraftOf(car);
    expect(draft).toEqual({ month: "2027-03", amount: "9000", note: "Car", sign: "out", currency: "UAH" });
    expect(savePlannedEvent([car], { ...draft, sign: "in", amount: "100" }, car, () => "x")).toEqual([
      { ...car, amount: 100 },
    ]);
    expect(savePlannedEvent([car], draft, "new", () => "copy")?.map((event) => event.id)).toEqual(["car", "copy"]);
    expect(savePlannedEvent([car], { ...draft, amount: "0" }, car, () => "x")).toBeNull();
  });
});

describe("byMonth", () => {
  it("orders the events by month", () => {
    const early = { ...car, id: "early", month: "2026-12" };
    expect(byMonth([car, early]).map((event) => event.id)).toEqual(["early", "car"]);
  });
});

describe("parseLegacyEvents and mergeEvents", () => {
  it("reads the old browser value and adds only the events not kept yet", () => {
    const older = parseLegacyEvents(
      JSON.stringify([car, { id: "bonus", month: "2027-01", amount: 300, currency: "UAH" }]),
    );
    expect(older.map((event) => event.id)).toEqual(["car", "bonus"]);
    expect(mergeEvents([car], older).map((event) => event.id)).toEqual(["car", "bonus"]);
    expect(parseLegacyEvents("{broken")).toEqual([]);
    expect(parseLegacyEvents(null)).toEqual([]);
  });
});
