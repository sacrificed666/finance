import { afterEach, describe, expect, it, vi } from "vitest";

import { mediaQuery } from "@/test/media";

import { crossfade } from "./crossfade";

// Makes the browser answer the reduced motion question
const stillness = (reduce: boolean) =>
  vi.spyOn(window, "matchMedia").mockImplementation((query) => mediaQuery(reduce, query));

describe("crossfade", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(document, "startViewTransition");
  });

  it("changes the page through a view transition where there is one", () => {
    stillness(false);
    const start = vi.fn<(change: () => void) => void>((change) => change());
    Object.defineProperty(document, "startViewTransition", { value: start, configurable: true });
    const change = vi.fn<() => void>();
    crossfade(change);
    expect(start).toHaveBeenCalledWith(change);
    expect(change).toHaveBeenCalledOnce();
  });

  it("changes it at once for reduced motion or without view transitions", () => {
    stillness(true);
    const start = vi.fn<(change: () => void) => void>();
    Object.defineProperty(document, "startViewTransition", { value: start, configurable: true });
    const change = vi.fn<() => void>();
    crossfade(change);
    Reflect.deleteProperty(document, "startViewTransition");
    vi.restoreAllMocks();
    stillness(false);
    crossfade(change);
    expect(start).not.toHaveBeenCalled();
    expect(change).toHaveBeenCalledTimes(2);
  });
});
