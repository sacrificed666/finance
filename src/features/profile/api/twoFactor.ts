import { readArray, readString } from "@/shared/lib/guards";

import { bodyOf } from "./profile";

// The address of two-factor sign-in on the app's server
const TWO_FACTOR_URL = "/api/profile/two-factor";

export interface TwoFactorSetup {
  secret: string;
  uri: string;
}

export type TwoFactorAnswer = { ok: true; recovery: string[] } | { ok: false; reason: "wait" | "wrong" | "failed" };

// Sends an action with an optional code and reads the answer
const post = async (action: string, code?: string) => {
  const response = await fetch(TWO_FACTOR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(code === undefined ? { action } : { action, code }),
  });
  return { ok: response.ok, body: await bodyOf(response) };
};

// A new secret and the address an authenticator app scans, or null
export const beginTwoFactor = async (): Promise<TwoFactorSetup | null> => {
  const answer = await post("begin").catch(() => null);
  const secret = readString(answer?.body, "secret");
  const uri = readString(answer?.body, "uri");
  return answer?.ok && secret && uri ? { secret, uri } : null;
};

// Confirms or turns off two-factor sign-in with a code
export const sendTwoFactor = async (action: "confirm" | "disable", code: string): Promise<TwoFactorAnswer> => {
  const answer = await post(action, code).catch(() => null);
  if (!answer) return { ok: false, reason: "failed" };
  if (!answer.ok) return { ok: false, reason: readString(answer.body, "error") === "wait" ? "wait" : "wrong" };
  return { ok: true, recovery: readArray(answer.body, "recovery").filter((item) => typeof item === "string") };
};
