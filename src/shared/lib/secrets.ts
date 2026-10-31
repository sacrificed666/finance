import "server-only";
import { log } from "@/shared/lib/log";
import { isSealed, keyFromAuthSecret, keyFromSetting, looksSealed, openWith, sealWith } from "@/shared/lib/sealing";

// The current key first, then older ones that may still open records
const loadKeys = (): { keys: Buffer[]; explicit: boolean } => {
  const configured = process.env.DATA_ENCRYPTION_KEY?.trim();
  const previous = process.env.DATA_ENCRYPTION_KEY_PREVIOUS?.trim();
  const auth = process.env.AUTH_SECRET?.trim();
  const fallback = auth ? keyFromAuthSecret(auth) : null;
  const candidates = [
    configured ? keyFromSetting(configured) : fallback,
    previous ? keyFromSetting(previous) : null,
    configured && auth ? keyFromAuthSecret(auth) : null,
  ].filter((key): key is Buffer => key !== null);
  const keys = candidates.filter((key, i) => candidates.findIndex((k) => k.equals(key)) === i);
  return { keys, explicit: Boolean(configured) };
};

const { keys, explicit } = loadKeys();
const [currentKey] = keys;

// How records are sealed: a set key, one derived from AUTH_SECRET or not at all
export const encryptionMode: "key" | "derived" | "off" = keys.length === 0 ? "off" : explicit ? "key" : "derived";

export const hasOlderKeys = keys.length > 1;

if (encryptionMode === "off") {
  log.warn("No DATA_ENCRYPTION_KEY or AUTH_SECRET, so records are stored unencrypted");
}

// Where each sealed value is kept; it opens only there, never copied elsewhere
export const sealedIn = {
  record: (userId: string, collection: string, id: string) => `records/${userId}/${collection}/${id}`,
  settings: (userId: string) => `settings/${userId}`,
  profile: (userId: string) => `users/${userId}/profile`,
  twoFactor: (userId: string) => `users/${userId}/two_factor`,
  attachment: (userId: string, id: string) => `attachments/${userId}/${id}`,
  integration: (userId: string, provider: string) => `integrations/${userId}/${provider}`,
  push: (userId: string, id: string) => `push_subscriptions/${userId}/${id}`,
  passkey: (userId: string, id: string) => `passkeys/${userId}/${id}`,
  signIn: (userId: string) => `sign_ins/${userId}`,
} as const;

// Text sealed with the current key for its place, or as it is without a key
export const seal = (plain: string, context: string): string =>
  currentKey ? sealWith(currentKey, plain, context) : plain;

// Stored text opened with a known key for its place; plain text comes as it is
export const open = (value: string | null | undefined, context: string): string | null => {
  if (value === null || value === undefined) return null;
  if (!looksSealed(value)) return value;
  if (!isSealed(value)) throw new Error("A record is sealed in a format this server does not read.");
  if (keys.length === 0) throw new Error("Encrypted records found but no encryption key is configured.");
  const opened = openWith(keys, value, context);
  if (!opened) throw new Error("A record is sealed with a key this server does not have, or for another place.");
  return opened.plain;
};

// A record sealed with an older key, sealed again with the current one
export const resealed = (value: string | null | undefined, context: string): string | null => {
  if (!value || !isSealed(value) || !currentKey || keys.length < 2) return null;
  const opened = openWith(keys, value, context);
  return opened && opened.keyIndex > 0 ? sealWith(currentKey, opened.plain, context) : null;
};

// A value as sealed JSON for its place
export const sealRecord = (value: unknown, context: string): string => seal(JSON.stringify(value), context);

// A sealed JSON value opened and parsed, or null when it is missing or broken
export const openRecord = (value: string | null | undefined, context: string): unknown => {
  const text = open(value, context);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
