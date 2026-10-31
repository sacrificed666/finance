import { describe, expect, it } from "vitest";

import robots from "./robots";

describe("robots", () => {
  it("keeps every robot out", () => {
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
});
