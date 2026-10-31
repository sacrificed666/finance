import { describe, expect, it } from "vitest";

import {
  ageFrom,
  avatarProblem,
  birthdayProblem,
  detailsChanged,
  patchProblem,
  profileDetails,
  profilePatch,
  websiteProblem,
  type Profile,
} from "./profileFields";

const profile: Profile = {
  id: "u",
  email: "me@example.com",
  emailVerified: null,
  name: "Me",
  image: null,
  about: null,
  occupation: null,
  location: "Kyiv",
  website: null,
  birthday: "1990-10-20",
  createdAt: "2026-01-01",
  hasPassword: true,
  providers: [],
  twoFactor: false,
  recoveryLeft: 0,
  passkeys: 0,
};

describe("profileDetails and detailsChanged", () => {
  it("fills the form and notices a change beyond spaces", () => {
    const stored = profileDetails(profile);
    expect(stored).toMatchObject({ name: "Me", image: "", location: "Kyiv" });
    expect(detailsChanged({ ...stored, name: " Me " }, stored)).toBe(false);
    expect(detailsChanged({ ...stored, about: "Hi" }, stored)).toBe(true);
  });
});

describe("ageFrom", () => {
  it("counts whole years up to the birthday", () => {
    expect(ageFrom("1990-10-20", new Date("2026-10-19T12:00:00Z"))).toBe(35);
    expect(ageFrom("1990-10-20", new Date("2026-10-20T12:00:00Z"))).toBe(36);
  });
});

describe("the field problems", () => {
  it("accepts https links and refuses the rest", () => {
    expect(avatarProblem("")).toBeNull();
    expect(avatarProblem("https://example.com/a.png")).toBeNull();
    expect(avatarProblem("http://example.com/a.png")).toBe("profile.problem.avatarHttps");
    expect(websiteProblem("not a url")).toBe("profile.problem.url");
    expect(websiteProblem(`https://example.com/${"a".repeat(200)}`)).toBe("profile.problem.websiteLong");
  });

  it("accepts a real birthday in the past", () => {
    const now = Date.parse("2026-10-10T00:00:00Z");
    expect(birthdayProblem("1990-10-20", now)).toBeNull();
    expect(birthdayProblem("20.10.1990", now)).toBe("profile.problem.birthdayFormat");
    expect(birthdayProblem("2027-01-01", now)).toBe("profile.problem.birthdayFuture");
    expect(birthdayProblem("1850-01-01", now)).toBe("profile.problem.birthdayOld");
  });
});

describe("profile updates", () => {
  it("takes the known fields, trimmed text or null, and skips anything else", () => {
    expect(profilePatch({ name: "  Me ", about: null, website: 5, id: "x", locale: "uk" })).toEqual({
      name: "Me",
      about: null,
    });
    expect(profilePatch({ about: "a".repeat(600) }).about).toHaveLength(500);
  });

  it("says what is wrong with an update", () => {
    const now = Date.parse("2026-10-10T00:00:00Z");
    expect(patchProblem({ name: "Me", birthday: "1990-10-20" }, now)).toBeNull();
    expect(patchProblem({ name: "a".repeat(81) }, now)).toBe("profile.problem.nameLong");
    expect(patchProblem({ image: "http://example.com/a.png" }, now)).toBe("profile.problem.avatarHttps");
    expect(patchProblem({ birthday: "2027-01-01" }, now)).toBe("profile.problem.birthdayFuture");
    expect(patchProblem({ location: "a".repeat(81) }, now)).toBe("profile.problem.valueLong");
  });
});
