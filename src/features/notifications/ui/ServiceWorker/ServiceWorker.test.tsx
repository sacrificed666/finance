import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "@/test/render";

import ServiceWorker from "./ServiceWorker";

const register = vi.fn<(url: string) => Promise<unknown>>();
const postMessage = vi.fn<(message: unknown) => void>();

describe("ServiceWorker", () => {
  beforeEach(() => {
    register.mockReset().mockResolvedValue({});
    postMessage.mockReset();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register, ready: Promise.resolve({ active: { postMessage } }) },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "serviceWorker");
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("stays away from development and tests", () => {
    renderWithI18n(<ServiceWorker />);
    expect(register).not.toHaveBeenCalled();
  });

  it("registers the worker in production once the page has loaded", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    renderWithI18n(<ServiceWorker />);
    expect(register).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("load"));
    expect(register).toHaveBeenCalledExactlyOnceWith("/sw.js");
  });

  it("registers right away when the page has already loaded", () => {
    vi.stubEnv("NODE_ENV", "production");
    register.mockRejectedValue(new Error("Refused"));
    renderWithI18n(<ServiceWorker />);
    expect(register).toHaveBeenCalledExactlyOnceWith("/sw.js");
  });

  it("tells the worker the language of the page", async () => {
    vi.stubEnv("NODE_ENV", "production");
    renderWithI18n(<ServiceWorker />, "uk");
    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith({ type: "locale", locale: "uk" });
    });
  });
});
