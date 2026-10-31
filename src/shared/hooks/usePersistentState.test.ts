import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { oneOf } from "@/shared/lib/listing";

import { usePersistentState } from "./usePersistentState";

describe("usePersistentState", () => {
  it("starts from the initial value and remembers a change", () => {
    const { result } = renderHook(() => usePersistentState("sort", "date"));
    expect(result.current[0]).toBe("date");
    act(() => result.current[1]("amount"));
    expect(result.current[0]).toBe("amount");
    expect(localStorage.getItem("finance:view:sort")).toBe('"amount"');
  });

  it("reads a stored value of the same type, and ignores one of another type", () => {
    localStorage.setItem("finance:view:dir", '"desc"');
    localStorage.setItem("finance:view:count", '"seven"');
    expect(renderHook(() => usePersistentState("dir", "asc")).result.current[0]).toBe("desc");
    expect(renderHook(() => usePersistentState("count", 3)).result.current[0]).toBe(3);
  });

  it("checks a stored value when it is given a check", () => {
    localStorage.setItem("finance:view:mode", '"grid"');
    const isMode = oneOf(["cards", "table"] as const);
    const { result } = renderHook(() => usePersistentState("mode", "cards", isMode));
    expect(result.current[0]).toBe("cards");
  });

  it("falls back to the initial value when storage is broken or blocked", () => {
    localStorage.setItem("finance:view:broken", "{");
    expect(renderHook(() => usePersistentState("broken", 1)).result.current[0]).toBe(1);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => usePersistentState("blocked", false));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
  });
});
