import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mediaQuery } from "@/test/media";

import CountUp from "./CountUp";

// A plain figure for the tests
const plain = (value: number) => `${String(Math.round(value))} ₴`;

describe("CountUp", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows its value at once, then rolls to a new one", () => {
    const { rerender } = render(<CountUp value={100} format={plain} />);
    expect(screen.getByText("100 ₴")).toBeInTheDocument();
    rerender(<CountUp value={200} format={plain} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const halfway = Number.parseInt(document.body.textContent ?? "", 10);
    expect(halfway).toBeGreaterThan(100);
    expect(halfway).toBeLessThan(200);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("200 ₴")).toBeInTheDocument();
  });

  it("jumps for reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => mediaQuery(true, query));
    const { rerender } = render(<CountUp value={5} format={plain} />);
    rerender(<CountUp value={9} format={plain} />);
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(screen.getByText("9 ₴")).toBeInTheDocument();
  });
});
