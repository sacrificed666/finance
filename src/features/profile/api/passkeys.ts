import type { PublicKeyCredentialCreationOptionsJSON, RegistrationResponseJSON } from "@simplewebauthn/browser";

import { isRecord, readArray, readString } from "@/shared/lib/guards";

import { bodyOf } from "./profile";

// The address of passkeys on the app's server
const PASSKEYS_URL = "/api/passkeys";

export interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

// A passkey from the server's answer, or null when it is not one
const parsePasskey = (row: unknown): Passkey | null => {
  const id = readString(row, "id");
  const createdAt = readString(row, "createdAt");
  if (!id || !createdAt) return null;
  return { id, name: readString(row, "name") ?? "", createdAt, lastUsedAt: readString(row, "lastUsedAt") };
};

// The passkeys of an answer that lists them
const passkeysOf = (body: unknown): Passkey[] =>
  readArray(body, "passkeys")
    .map(parsePasskey)
    .filter((passkey) => passkey !== null);

// Whether the server gave options a browser can register a passkey with
const isCreationOptions = (value: unknown): value is PublicKeyCredentialCreationOptionsJSON =>
  isRecord(value) && typeof value.challenge === "string" && isRecord(value.rp) && isRecord(value.user);

// Sends JSON to the passkeys address and reads the passkeys back, or null
const send = async (method: "POST" | "DELETE", payload: object): Promise<Passkey[] | null> => {
  const response = await fetch(PASSKEYS_URL, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
  return response?.ok ? passkeysOf(await bodyOf(response)) : null;
};

// The account's passkeys, none when the server does not answer
export const fetchPasskeys = async (): Promise<Passkey[]> => {
  const response = await fetch(PASSKEYS_URL, { cache: "no-store" }).catch(() => null);
  return response?.ok ? passkeysOf(await bodyOf(response)) : [];
};

// The options to register a new passkey with, or null
export const registrationOptions = async (): Promise<PublicKeyCredentialCreationOptionsJSON | null> => {
  const response = await fetch(`${PASSKEYS_URL}/options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose: "register" }),
  }).catch(() => null);
  const body = response?.ok ? await bodyOf(response) : null;
  return isCreationOptions(body) ? body : null;
};

// Keeps a new passkey and gives back them all, or null when it was refused
export const savePasskey = (response: RegistrationResponseJSON): Promise<Passkey[] | null> =>
  send("POST", { response });

// Forgets a passkey and gives back the rest, or null when it failed
export const removePasskey = (id: string): Promise<Passkey[] | null> => send("DELETE", { id });
