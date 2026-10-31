// A random id for a new record, also where crypto.randomUUID is missing
export const uid = (): string => {
  // A plain http address on the network has no randomUUID
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};
