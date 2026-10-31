import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import { keyFromSetting, sealWith } from "@/shared/lib/sealing";
import { answerQueries, statements, type QueryFn } from "@/test/db";

const db = vi.hoisted(() => ({ query: vi.fn<QueryFn>() }));

vi.mock("@/shared/api/db", () => ({
  getPool: () => ({ query: db.query }),
  ensureSchema: () => Promise.resolve(),
  withTransaction: (work: (client: { query: QueryFn }) => Promise<unknown>) => work({ query: db.query }),
}));

const KEY = Buffer.alloc(32, 1).toString("base64");
const OLD = Buffer.alloc(32, 2).toString("base64");

// Text sealed with the older key for a place
const oldSealed = (plain: string, place: string) => sealWith(keyFromSetting(OLD), plain, place);

// The modules as a server with these keys would load them
const load = async (env: Record<string, string>) => {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  const [reseal, secrets] = await Promise.all([import("./reseal"), import("@/shared/lib/secrets")]);
  return { ...reseal, ...secrets };
};

describe("reseal", () => {
  let info: MockInstance<(message: string) => void>;

  beforeEach(() => {
    db.query.mockReset();
    info = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does nothing without an older key", async () => {
    const { resealOlderRecords } = await load({
      DATA_ENCRYPTION_KEY: KEY,
      DATA_ENCRYPTION_KEY_PREVIOUS: "",
      AUTH_SECRET: "",
    });
    await expect(resealOlderRecords("u1")).resolves.toBe(0);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("seals the rows of an older key again in their own places, once per account", async () => {
    const { resealOlderRecords, open, seal, sealedIn } = await load({
      DATA_ENCRYPTION_KEY: KEY,
      DATA_ENCRYPTION_KEY_PREVIOUS: OLD,
      AUTH_SECRET: "",
    });
    const lunch = sealedIn.record("u1", "transactions", "t1");
    answerQueries(db.query, [
      [
        /FROM records/u,
        () => [
          { at: "(0,1)", secret: oldSealed("lunch", lunch), collection: "transactions", id: "t1" },
          {
            at: "(0,2)",
            secret: seal("dinner", sealedIn.record("u1", "transactions", "t2")),
            collection: "transactions",
            id: "t2",
          },
        ],
      ],
      [/FROM passkeys/u, () => [{ at: "(0,3)", secret: oldSealed("key", sealedIn.passkey("u1", "k1")), id: "k1" }]],
      [/FROM users/u, () => [{ profile_secret: oldSealed("profile", sealedIn.profile("u1")), two_factor: null }]],
    ]);
    await expect(resealOlderRecords("u1")).resolves.toBe(3);
    const updates = db.query.mock.calls.filter(([sql]) => sql.startsWith("UPDATE"));
    expect(updates).toHaveLength(3);
    expect(updates[0]?.[0]).toBe("UPDATE records SET secret = $2 WHERE ctid = $1::tid");
    const [at, next] = updates[0]?.[1] ?? [];
    expect(at).toBe("(0,1)");
    expect(open(String(next), lunch)).toBe("lunch");
    expect(open(String(updates[1]?.[1]?.[1]), sealedIn.passkey("u1", "k1"))).toBe("key");
    expect(statements(db.query)).toContain(
      "SELECT ctid::text AS at, secret, collection, id FROM records WHERE user_id = $1 AND secret LIKE $2 FOR UPDATE",
    );
    expect(open(String(updates[2]?.[1]?.[1]), sealedIn.profile("u1"))).toBe("profile");
    expect(updates[2]?.[1]?.[2]).toBeNull();
    expect(info).toHaveBeenCalledOnce();

    db.query.mockClear();
    await expect(resealOlderRecords("u1")).resolves.toBe(0);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("leaves accounts with nothing old alone and tries again after a failure", async () => {
    const { resealOlderRecords } = await load({
      DATA_ENCRYPTION_KEY: KEY,
      DATA_ENCRYPTION_KEY_PREVIOUS: OLD,
      AUTH_SECRET: "",
    });
    answerQueries(db.query, []);
    await expect(resealOlderRecords("u2")).resolves.toBe(0);
    expect(info).not.toHaveBeenCalled();

    db.query.mockRejectedValueOnce(new Error("offline"));
    await expect(resealOlderRecords("u3")).rejects.toThrow("offline");
    await expect(resealOlderRecords("u3")).resolves.toBe(0);
  });
});
