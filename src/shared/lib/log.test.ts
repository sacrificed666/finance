import { describe, expect, it, vi } from "vitest";

import { log } from "./log";

describe("log", () => {
  it("names the app and adds the context as JSON", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    log.warn("Slow answer", { path: "/api/state", status: 429 });
    log.error("Broken");
    log.info("Ready");
    expect(warn).toHaveBeenCalledWith('[finance] Slow answer {"path":"/api/state","status":429}');
    expect(error).toHaveBeenCalledWith("[finance] Broken");
    expect(info).toHaveBeenCalledWith("[finance] Ready");
  });

  it("names the environment unless it is production", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubEnv("APP_ENV", "staging");
    log.info("Ready");
    vi.stubEnv("APP_ENV", "production");
    log.info("Ready");
    expect(info.mock.calls).toEqual([["[finance staging] Ready"], ["[finance] Ready"]]);
  });
});
