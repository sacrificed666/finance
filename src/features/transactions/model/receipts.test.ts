import { describe, expect, it, vi } from "vitest";

import { shrinkPhoto } from "./receipts";

// A canvas that records its size and encodes to a fixed blob
const fakeCanvas = (blob: Blob | null, context: unknown = { drawImage: vi.fn<() => void>() }) => {
  const canvas = Object.assign(document.createElement("canvas"), {
    getContext: () => context,
    toBlob: (callback: (encoded: Blob | null) => void) => callback(blob),
  });
  vi.spyOn(document, "createElement").mockReturnValue(canvas);
  return canvas;
};

describe("shrinkPhoto", () => {
  it("scales a large photo down to 1600 px and encodes it as base64 WebP", async () => {
    vi.stubGlobal("createImageBitmap", () =>
      Promise.resolve({ width: 3200, height: 1600, close: vi.fn<() => void>() }),
    );
    const canvas = fakeCanvas(new Blob([new Uint8Array([104, 105])], { type: "image/webp" }));
    const result = await shrinkPhoto(new File(["x"], "a.jpg"));
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(800);
    expect(result).toEqual({ mime: "image/webp", data: btoa("hi") });
  });

  it("keeps a small photo's size and names the format when the browser does not", async () => {
    vi.stubGlobal("createImageBitmap", () => Promise.resolve({ width: 400, height: 300, close: vi.fn<() => void>() }));
    const canvas = fakeCanvas(new Blob([new Uint8Array([1])]));
    const result = await shrinkPhoto(new File(["x"], "a.png"));
    expect(canvas.width).toBe(400);
    expect(result.mime).toBe("image/webp");
  });

  it("fails without a canvas or an encoder", async () => {
    vi.stubGlobal("createImageBitmap", () => Promise.resolve({ width: 10, height: 10, close: vi.fn<() => void>() }));
    fakeCanvas(null, null);
    await expect(shrinkPhoto(new File(["x"], "a.png"))).rejects.toThrow("No 2D canvas");
    fakeCanvas(null);
    await expect(shrinkPhoto(new File(["x"], "a.png"))).rejects.toThrow("encode");
  });
});
