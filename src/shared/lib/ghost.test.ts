import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mediaQuery } from "@/test/media";

import { ghostDim, ghostOut } from "./ghost";

// Makes the browser answer the reduced motion question
const stillness = (reduce: boolean) =>
  vi.spyOn(window, "matchMedia").mockImplementation((query) => mediaQuery(reduce && query.includes("reduce"), query));

// An element with a size, as a browser would lay it out
const laidOut = (element: HTMLElement) => {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 300, 200));
  return element;
};

describe("ghostOut", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("leaves a frozen, hidden copy with the typed values that goes once its animation ends", () => {
    stillness(false);
    const panel = laidOut(document.createElement("div"));
    panel.id = "panel";
    const input = document.createElement("input");
    panel.append(input);
    input.value = "Typed";
    ghostOut(panel, "leaving");
    const ghost = document.body.querySelector<HTMLElement>(".leaving");
    expect(ghost).toHaveAttribute("aria-hidden", "true");
    expect(ghost?.id).toBe("");
    expect(ghost?.style.top).toBe("20px");
    expect(ghost?.querySelector("input")?.value).toBe("Typed");
    ghost?.dispatchEvent(new Event("animationend"));
    expect(document.body.querySelector(".leaving")).toBeNull();
  });

  it("leaves nothing for reduced motion, for an element without a size or for none", () => {
    stillness(true);
    ghostOut(laidOut(document.createElement("div")), "leaving");
    ghostDim("dim");
    vi.restoreAllMocks();
    stillness(false);
    ghostOut(document.createElement("div"), "leaving");
    ghostOut(null, "leaving");
    ghostOut(laidOut(document.createElement("div")));
    ghostDim();
    expect(document.body.children).toHaveLength(0);
  });

  it("fades a dim that goes by itself after a while", () => {
    stillness(false);
    ghostDim("dim");
    expect(document.body.querySelector(".dim")).toBeInTheDocument();
    vi.advanceTimersByTime(700);
    expect(document.body.querySelector(".dim")).toBeNull();
  });
});
