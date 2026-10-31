import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerQueries, type QueryFn } from "@/test/db";

const db = vi.hoisted(() => {
  vi.stubEnv("DATA_ENCRYPTION_KEY", Buffer.alloc(32, 6).toString("base64"));
  return { query: vi.fn<QueryFn>() };
});

vi.mock("@/shared/api/db", () => ({ getPool: () => ({ query: db.query }), ensureSchema: () => Promise.resolve() }));

const { openRecord, sealedIn, sealRecord } = await import("@/shared/lib/secrets");
const { loadProfile, saveProfile } = await import("./profileRepo");

// The sealed personal fields of an account
const PERSONAL = {
  name: "Ann",
  image: "https://example.com/ann.png",
  about: "Saves money",
  occupation: "Designer",
  location: "Kyiv",
  website: "https://ann.example",
  birthday: "1990-05-01",
};

// An account row with its profile sealed
const ROW = {
  id: "u1",
  email: "ann@example.com",
  name: null,
  image: null,
  profile_secret: sealRecord(PERSONAL, sealedIn.profile("u1")),
  two_factor: null,
  email_verified: "2026-01-01T10:00:00Z",
  created_at: "2026-01-01",
  has_password: true,
  providers: ["google"],
  passkeys: 2,
};

// Answers the profile query with this row, or none
const account = (row: object | null) =>
  answerQueries(db.query, [[/FROM users u WHERE u\.id = \$1/u, () => (row ? [row] : [])]]);

// The sealed personal fields of the last update
const savedPersonal = () => openRecord(String(db.query.mock.calls.at(-1)?.[1]?.[1]), sealedIn.profile("u1"));

describe("profileRepo", () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  it("opens the sealed profile with the sign-in methods", async () => {
    account(ROW);
    await expect(loadProfile("u1")).resolves.toEqual({
      id: "u1",
      email: "ann@example.com",
      emailVerified: "2026-01-01T10:00:00Z",
      ...PERSONAL,
      createdAt: "2026-01-01",
      hasPassword: true,
      providers: ["google"],
      twoFactor: false,
      recoveryLeft: 0,
      passkeys: 2,
      googleAvailable: false,
    });
  });

  it("takes Google's name and image until the profile is saved, and counts recovery codes", async () => {
    account({
      ...ROW,
      name: "Google Ann",
      image: "https://example.com/g.png",
      profile_secret: null,
      providers: null,
      passkeys: null,
      two_factor: sealRecord({ secret: "BASE32", recovery: ["a", "b", "c"] }, sealedIn.twoFactor("u1")),
    });
    await expect(loadProfile("u1")).resolves.toMatchObject({
      name: "Google Ann",
      image: "https://example.com/g.png",
      about: null,
      birthday: null,
      providers: [],
      twoFactor: true,
      recoveryLeft: 3,
      passkeys: 0,
    });
    account(null);
    await expect(loadProfile("missing")).resolves.toBeNull();
  });

  it("seals the changed fields with the rest and clears Google's copy", async () => {
    account(ROW);
    await saveProfile("u1", { name: "  Anna  ", about: "   " });
    const [sql, params] = db.query.mock.calls.at(-1) ?? [];
    expect(sql).toBe("UPDATE users SET profile_secret = $2, name = NULL, image = NULL WHERE id = $1");
    expect(params?.[0]).toBe("u1");
    expect(savedPersonal()).toEqual({ ...PERSONAL, name: "Anna", about: null });
    await saveProfile("u1", { website: null });
    expect(savedPersonal()).toMatchObject({ website: null, name: "Ann" });
  });

  it("writes nothing for an empty change or a missing account", async () => {
    account(null);
    await saveProfile("u1", {});
    expect(db.query).not.toHaveBeenCalled();
    await saveProfile("missing", { name: "X" });
    expect(db.query).toHaveBeenCalledOnce();
  });
});
