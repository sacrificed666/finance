import { describe, expect, it, vi } from "vitest";

import { answerQueries, type QueryFn } from "@/test/db";

const db = vi.hoisted(() => {
  vi.stubEnv("DATA_ENCRYPTION_KEY", Buffer.alloc(32, 4).toString("base64"));
  return { query: vi.fn<QueryFn>() };
});

vi.mock("@/shared/api/db", () => ({ getPool: () => ({ query: db.query }), ensureSchema: () => Promise.resolve() }));

const { ATTACHMENT_STORAGE_BYTES, loadAttachment, pruneAttachments, saveAttachment } = await import("./attachments");

describe("attachments", () => {
  it("keeps a photo sealed and gives it back", async () => {
    const rows = new Map<string, { mime: string; secret: string }>();
    answerQueries(db.query, [
      [
        /^INSERT INTO attachments/u,
        ([, id, mime, secret]) => (rows.set(String(id), { mime: String(mime), secret: String(secret) }), []),
      ],
      [
        /^SELECT mime, secret FROM attachments/u,
        ([, id]) => {
          const row = rows.get(String(id));
          return row ? [row] : [];
        },
      ],
    ]);
    const photo = Buffer.from([1, 2, 3, 4]);
    const id = (await saveAttachment("u1", "image/webp", photo)) ?? "";
    expect(id).toMatch(/^[\da-f-]{36}$/u);
    expect(rows.get(id)?.secret).toMatch(/^enc\.v2\./u);
    await expect(loadAttachment("u1", id)).resolves.toEqual({ mime: "image/webp", data: photo });
    await expect(loadAttachment("u1", "missing")).resolves.toBeNull();
  });

  it("refuses a photo once the account's storage is full", async () => {
    answerQueries(db.query, [[/^SELECT coalesce/u, () => [{ used: String(ATTACHMENT_STORAGE_BYTES) }]]]);
    await expect(saveAttachment("u1", "image/webp", Buffer.from([1]))).resolves.toBeNull();
    expect(db.query).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO attachments"), expect.anything());
  });

  it("deletes day-old photos no entry refers to", async () => {
    const client = { query: vi.fn<QueryFn>().mockResolvedValue({ rows: [], rowCount: 2 }) };
    await pruneAttachments(client, "u1", ["a1"]);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("interval '1 day'"), ["u1", ["a1"]]);
  });
});
