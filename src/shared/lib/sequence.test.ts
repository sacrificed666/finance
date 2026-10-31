import { describe, expect, it } from "vitest";

import { mapInOrder } from "./sequence";

describe("mapInOrder", () => {
  it("runs each step after the one before and keeps the order", async () => {
    const started: number[] = [];
    // A step that finishes sooner for later items
    const step = async (item: number) => {
      started.push(item);
      await new Promise((resolve) => {
        setTimeout(resolve, 10 - item * 3);
      });
      return item * 2;
    };
    await expect(mapInOrder([1, 2, 3], step)).resolves.toEqual([2, 4, 6]);
    expect(started).toEqual([1, 2, 3]);
  });

  it("stops at the first failure", async () => {
    const seen: number[] = [];
    // A step that fails on the second item
    const step = (item: number) => {
      seen.push(item);
      return item === 2 ? Promise.reject(new Error("no")) : Promise.resolve(item);
    };
    await expect(mapInOrder([1, 2, 3], step)).rejects.toThrow("no");
    expect(seen).toEqual([1, 2]);
  });
});
