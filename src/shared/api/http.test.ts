import { describe, expect, it } from "vitest";

import { failure, jsonBody, notSignedIn, tooMany } from "./http";

// A POST request with the body as it is
const post = (body: string) => new Request("http://localhost/api", { method: "POST", body });

describe("http", () => {
  it("reads a JSON body, and null for a broken one", async () => {
    await expect(jsonBody(post('{"a":1}'))).resolves.toEqual({ a: 1 });
    await expect(jsonBody(post("{"))).resolves.toBeNull();
    await expect(jsonBody(new Request("http://localhost/api"))).resolves.toBeNull();
  });

  it("answers errors with their status", async () => {
    const answer = failure("Bad id.", 400);
    expect(answer.status).toBe(400);
    await expect(answer.json()).resolves.toEqual({ error: "Bad id." });
    expect(notSignedIn().status).toBe(401);
  });

  it("says when to try again", () => {
    const answer = tooMany("wait", 42);
    expect(answer.status).toBe(429);
    expect(answer.headers.get("Retry-After")).toBe("42");
  });
});
