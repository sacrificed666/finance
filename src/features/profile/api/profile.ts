import type { Profile, ProfileDetails } from "@/features/profile/model/profileFields";
import { isRecord, readArray, readNumber, readString } from "@/shared/lib/guards";

// The address of the profile on the app's server
const PROFILE_URL = "/api/profile";

// What a request that may fail came to: its data, or the server's reason if any
export type Answer<T> = { ok: true; data: T } | { ok: false; error: string | null };

// A text of the answer, kept as it is, or null
const textOf = (source: unknown, key: string): string | null => {
  const value = isRecord(source) ? source[key] : null;
  return typeof value === "string" ? value : null;
};

// A profile from the server's answer, or null when it is not one
export const parseProfile = (body: unknown): Profile | null => {
  const id = readString(body, "id");
  const createdAt = readString(body, "createdAt");
  if (!isRecord(body) || !id || !createdAt) return null;
  return {
    id,
    email: textOf(body, "email"),
    emailVerified: textOf(body, "emailVerified"),
    name: textOf(body, "name"),
    image: textOf(body, "image"),
    about: textOf(body, "about"),
    occupation: textOf(body, "occupation"),
    location: textOf(body, "location"),
    website: textOf(body, "website"),
    birthday: textOf(body, "birthday"),
    createdAt,
    hasPassword: body.hasPassword === true,
    providers: readArray(body, "providers").filter((provider) => typeof provider === "string"),
    twoFactor: body.twoFactor === true,
    recoveryLeft: readNumber(body, "recoveryLeft") ?? 0,
    passkeys: readNumber(body, "passkeys") ?? 0,
    googleAvailable: body.googleAvailable === true,
  };
};

// The body of an answer, or nothing when it is not JSON
export const bodyOf = async (response: Response): Promise<unknown> => {
  try {
    const body: unknown = await response.json();
    return body;
  } catch {
    return null;
  }
};

// The signed-in account's profile, or null when the server does not give it
export const fetchProfile = async (): Promise<Profile | null> => {
  const response = await fetch(PROFILE_URL, { cache: "no-store" }).catch(() => null);
  return response?.ok ? parseProfile(await bodyOf(response)) : null;
};

// Saves the personal details and gives back the profile as stored
export const saveDetails = async (details: ProfileDetails): Promise<Answer<Profile>> => {
  const response = await fetch(PROFILE_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  }).catch(() => null);
  const body = response ? await bodyOf(response) : null;
  const profile = response?.ok ? parseProfile(body) : null;
  return profile ? { ok: true, data: profile } : { ok: false, error: readString(body, "error") };
};

// Sets or changes the password, the current one first when there is one
export const changePassword = async (current: string, next: string): Promise<Answer<null>> => {
  const response = await fetch(`${PROFILE_URL}/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current, next }),
  }).catch(() => null);
  if (response?.ok) return { ok: true, data: null };
  return { ok: false, error: response ? readString(await bodyOf(response), "error") : null };
};

// Ends every session of the account, this one too
export const endAllSessions = async (): Promise<boolean> => {
  const response = await fetch(`${PROFILE_URL}/sessions`, { method: "DELETE" }).catch(() => null);
  return response?.ok === true;
};

export type SignInMethod = "password" | "google" | "passkey";

export interface SignIn {
  id: string;
  at: string;
  method: SignInMethod;
  device: string;
  ip: string;
}

export interface SignIns {
  current: string | null;
  entries: SignIn[];
}

// A sign-in method the app knows, or null
const methodOf = (value: string | null): SignInMethod | null =>
  value === "password" || value === "google" || value === "passkey" ? value : null;

// A sign-in from the server's answer, or null when it is not one
const parseSignIn = (row: unknown): SignIn | null => {
  const id = readString(row, "id");
  const at = readString(row, "at");
  const method = methodOf(readString(row, "method"));
  if (!id || !at || !method) return null;
  return { id, at, method, device: textOf(row, "device") ?? "", ip: textOf(row, "ip") ?? "" };
};

// The account's recent sign-ins and which of them is this one
export const fetchSignIns = async (): Promise<SignIns | null> => {
  const response = await fetch(`${PROFILE_URL}/sign-ins`, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;
  const body = await bodyOf(response);
  return {
    current: readString(body, "current"),
    entries: readArray(body, "entries")
      .map(parseSignIn)
      .filter((entry) => entry !== null),
  };
};
