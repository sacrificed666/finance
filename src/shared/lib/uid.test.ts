import { describe, expect, it, vi } from "vitest";

import { uid } from "./uid";

describe("uid", () => {
  it("uses the browser's random UUIDs", () => {
    expect(uid()).toMatch(/^[0-9a-f-]{36}$/u);
    expect(uid()).not.toBe(uid());
  });

  it("makes up its own id where randomUUID is missing", () => {
    vi.stubGlobal("crypto", {});
    expect(uid()).toMatch(/^id-[0-9a-z]+-[0-9a-z]+$/u);
  });
});
