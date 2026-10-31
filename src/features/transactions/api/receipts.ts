import { shrinkPhoto } from "@/features/transactions/model/receipts";
import { readString } from "@/shared/lib/guards";

// Stores one photo, shrunk first, and gives its id
const uploadReceipt = async (file: File): Promise<string> => {
  const response = await fetch("/api/attachments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(await shrinkPhoto(file)),
  });
  if (!response.ok) throw new Error(`Upload failed: ${String(response.status)}`);
  const id = readString(await response.json(), "id");
  if (!id) throw new Error("Upload failed: no id");
  return id;
};

// Stores photos one by one; a failure keeps the ids stored before it
export const uploadReceipts = async (
  files: readonly File[],
  stored: readonly string[] = [],
): Promise<{ ids: string[]; failed: boolean }> => {
  const [file, ...rest] = files;
  if (!file) return { ids: [...stored], failed: false };
  let id: string;
  try {
    id = await uploadReceipt(file);
  } catch {
    return { ids: [...stored], failed: true };
  }
  return uploadReceipts(rest, [...stored, id]);
};
