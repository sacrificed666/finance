// The longest side of a stored receipt photo
const MAX_SIDE = 1600;
// Bytes turned into text in one go, small enough for the argument limit
const CHUNK = 0x8000;

export interface ShrunkPhoto {
  mime: string;
  data: string;
}

// A photo scaled down in the browser to WebP and encoded as base64 for the upload
export const shrinkPhoto = async (file: File): Promise<ShrunkPhoto> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No 2D canvas");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((encoded) => (encoded ? resolve(encoded) : reject(new Error("encode"))), "image/webp", 0.8);
  });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK));
  }
  return { mime: blob.type || "image/webp", data: btoa(binary) };
};
