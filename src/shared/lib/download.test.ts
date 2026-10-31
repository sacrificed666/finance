import { describe, expect, it, vi } from "vitest";

import { downloadFile } from "./download";

describe("downloadFile", () => {
  it("saves the text through a temporary link and lets the address go", () => {
    vi.useFakeTimers();
    const create = vi.fn<(blob: Blob) => string>(() => "blob:file");
    const revoke = vi.fn<(url: string) => void>();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    downloadFile("backup.json", "{}", "application/json");
    expect(create.mock.calls[0]?.[0].type).toBe("application/json");
    expect(click).toHaveBeenCalledOnce();
    expect(click.mock.contexts[0]).toMatchObject({ download: "backup.json", href: "blob:file" });
    expect(document.querySelector("a")).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith("blob:file");
    vi.useRealTimers();
  });
});
