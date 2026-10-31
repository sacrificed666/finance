import { startAuthentication, type PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { signIn } from "next-auth/react";

import { isRecord, readString } from "@/shared/lib/guards";

export type PasswordSignIn = "ok" | "two_factor" | "two_factor_wrong" | "failed";

// Creates an account; the server's reason when it refuses, or null
export const registerAccount = async (fields: {
  email: string;
  password: string;
  name: string;
}): Promise<string | null> => {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (response.ok) return null;
  const body: unknown = await response.json().catch(() => null);
  return readString(body, "error") ?? "";
};

// Signs in with a password and, when the account asks for one, a code
export const signInWithPassword = async (email: string, password: string, code: string): Promise<PasswordSignIn> => {
  const result = await signIn("credentials", { email, password, code, redirect: false });
  if (result.code === "two_factor" || result.code === "two_factor_wrong") return result.code;
  return result.error ? "failed" : "ok";
};

// Whether the server gave options a browser can sign in with a passkey by
const isRequestOptions = (value: unknown): value is PublicKeyCredentialRequestOptionsJSON =>
  isRecord(value) && typeof value.challenge === "string";

// Signs in with a passkey of this device: done, cancelled or failed
export const signInWithPasskey = async (): Promise<"ok" | "cancelled" | "failed"> => {
  const response = await fetch("/api/passkeys/options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose: "login" }),
  }).catch(() => null);
  const options: unknown = response?.ok ? await response.json().catch(() => null) : null;
  if (!isRequestOptions(options)) return "failed";
  try {
    const credential = await startAuthentication({ optionsJSON: options });
    const result = await signIn("passkey", { response: JSON.stringify(credential), redirect: false });
    return result.error ? "failed" : "ok";
  } catch (error) {
    return error instanceof Error && error.name === "NotAllowedError" ? "cancelled" : "failed";
  }
};

// Signs in with Google and comes back to a page
export const signInWithGoogle = async (next: string): Promise<void> => {
  await signIn("google", { redirectTo: next });
};
