import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, vi } from "vitest";

import { installDialogPolyfill, resetDialogs } from "./dialog";
import { resizeEntry } from "./geometry";
import { mediaQuery } from "./media";

installDialogPolyfill();

// Plain anchors stand in for Next.js links
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) =>
    createElement("a", { href, ...props }, children),
}));

// A media query that never matches, which jsdom does not have; tests can spy on it
const neverMatches = (query: string): MediaQueryList => mediaQuery(false, query);

Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: neverMatches });

// jsdom has no layout, so every observed box reports this width, or its data-width
const TEST_WIDTH = 320;

// A box of the test width, or the element's data-width
const testEntry = (target: Element): ResizeObserverEntry =>
  resizeEntry(target, Number((target instanceof HTMLElement ? target.dataset.width : undefined) ?? TEST_WIDTH));

// A ResizeObserver that measures once, as soon as an element is observed
class TestResizeObserver implements ResizeObserver {
  readonly callback: ResizeObserverCallback;

  // Keeps the callback to report sizes to
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  // Reports the element's test width straight away
  observe(target: Element) {
    this.callback([testEntry(target)], this);
  }

  // Nothing to stop watching
  unobserve() {}

  // Nothing to let go of
  disconnect() {}
}

Object.defineProperty(window, "ResizeObserver", { configurable: true, writable: true, value: TestResizeObserver });

// jsdom does not scroll, so scrolling into view does nothing
Element.prototype.scrollIntoView = () => {};

// A fresh document, storage and environment for every test
afterEach(() => {
  // Test files share process.env in a worker, so a stub must not outlive its test
  vi.unstubAllEnvs();
  cleanup();
  resetDialogs();
  localStorage.clear();
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; max-age=0; path=/`;
  });
});
