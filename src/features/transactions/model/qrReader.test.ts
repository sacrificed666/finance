import { afterEach, describe, expect, it, vi } from "vitest";

import { readQr } from "./qrReader";

const jsqr = vi.hoisted(() =>
  vi.fn<(data: Uint8ClampedArray, width: number, height: number) => { data: string } | null>(),
);

vi.mock("jsqr", () => ({ default: jsqr }));

// A photo the size of a phone's camera
const bitmap = { width: 3000, height: 4000, close: vi.fn<() => void>() };

describe("readQr", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    jsqr.mockReset();
  });

  it("asks the browser's own reader first", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn<() => Promise<typeof bitmap>>().mockResolvedValue(bitmap));
    vi.stubGlobal(
      "BarcodeDetector",
      class {
        detect = () => Promise.resolve([{ rawValue: "https://cabinet.tax.gov.ua/cashregs/check?id=1" }]);
      },
    );
    await expect(readQr(new Blob())).resolves.toBe("https://cabinet.tax.gov.ua/cashregs/check?id=1");
    expect(jsqr).not.toHaveBeenCalled();
    expect(bitmap.close).toHaveBeenCalled();
  });

  it("reads the photo with jsQR where the browser has no reader, larger when needed", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn<() => Promise<typeof bitmap>>().mockResolvedValue(bitmap));
    const context = { drawImage: vi.fn<() => void>(), getImageData: () => ({ data: new Uint8ClampedArray(4) }) };
    const canvas = Object.assign(document.createElement("canvas"), { getContext: () => context });
    vi.spyOn(document, "createElement").mockReturnValue(canvas);
    jsqr.mockReturnValueOnce(null).mockReturnValueOnce({ data: "found" });
    await expect(readQr(new Blob())).resolves.toBe("found");
    expect(jsqr.mock.calls.map(([, width, height]) => [width, height])).toEqual([
      [1200, 1600],
      [1800, 2400],
    ]);
  });
});
