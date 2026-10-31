// The sides a photo is read at when the browser has no QR reader of its own
const SIDE = 1600;
const LARGE_SIDE = 2400;

interface DetectedCode {
  rawValue: string;
}

interface Detector {
  detect: (image: ImageBitmap) => Promise<DetectedCode[]>;
}

type DetectorClass = new (options: { formats: string[] }) => Detector;

// Whether a global is a barcode reader class
const isDetectorClass = (value: unknown): value is DetectorClass => typeof value === "function";

// The browser's own barcode reader, where it has one
const browserDetector = (): DetectorClass | null => {
  const found: unknown = Reflect.get(globalThis, "BarcodeDetector");
  return isDetectorClass(found) ? found : null;
};

// The text of a QR code the browser finds in a photo, or null
const detectInBrowser = async (bitmap: ImageBitmap): Promise<string | null> => {
  const Found = browserDetector();
  if (!Found) return null;
  try {
    const codes = await new Found({ formats: ["qr_code"] }).detect(bitmap);
    return codes[0]?.rawValue ?? null;
  } catch {
    return null;
  }
};

// The text of a QR code in a photo drawn at most so large, read by jsQR
const decodeAt = async (bitmap: ImageBitmap, side: number): Promise<string | null> => {
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const { default: jsQR } = await import("jsqr");
  return jsQR(data, width, height, { inversionAttempts: "attemptBoth" })?.data ?? null;
};

// The text of the first QR code in a photo, or null when there is none
export const readQr = async (photo: Blob): Promise<string | null> => {
  const bitmap = await createImageBitmap(photo);
  try {
    // A larger drawing only when the smaller one found nothing, as it takes longer
    return (await detectInBrowser(bitmap)) ?? (await decodeAt(bitmap, SIDE)) ?? (await decodeAt(bitmap, LARGE_SIDE));
  } finally {
    bitmap.close();
  }
};
