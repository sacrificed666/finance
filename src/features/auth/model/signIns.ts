import "server-only";
import { headers } from "next/headers";

import { pushTo } from "@/features/notifications/model/push";
import { ensureSchema, getPool } from "@/shared/api/db";
import { isLocale } from "@/shared/i18n/locales";
import type { Locale } from "@/shared/i18n/locales";
import { serverMessages } from "@/shared/i18n/server";
import { makeI18n } from "@/shared/i18n/translate";
import { clientAddress, deviceLabel } from "@/shared/lib/device";
import { isRecord, readText } from "@/shared/lib/guards";
import { openRecord, sealedIn, sealRecord } from "@/shared/lib/secrets";

export type SignInMethod = "password" | "google" | "passkey";

interface SignInRecord {
  method: SignInMethod;
  device: string;
  ip: string;
}

export interface SignInEntry extends SignInRecord {
  id: string;
  at: string;
}

const KEEP = 50;
const FAMILIAR_MS = 180 * 86_400_000;

// The ways to sign in a stored record may name
const METHODS = new Set<unknown>(["password", "google", "passkey"] satisfies SignInMethod[]);

// Whether a value names a way to sign in
const isMethod = (value: unknown): value is SignInMethod => METHODS.has(value);

// A stored sign-in, or null when the record is not one
const signInRecord = (value: unknown): SignInRecord | null => {
  const method = isRecord(value) ? value.method : null;
  const device = readText(value, "device");
  const ip = readText(value, "ip");
  return isMethod(method) && device !== null && ip !== null ? { method, device, ip } : null;
};

// The latest sign-ins of an account, newest first
const entries = async (userId: string, limit: number): Promise<SignInEntry[]> => {
  const res = await getPool().query<{ id: string; at: string; secret: string }>(
    `SELECT id::text AS id, to_char(at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS at, secret
       FROM sign_ins WHERE user_id = $1 ORDER BY at DESC, id DESC LIMIT $2`,
    [userId, limit],
  );
  return res.rows.flatMap((row) => {
    const record = signInRecord(openRecord(row.secret, sealedIn.signIn(userId)));
    return record ? [{ id: row.id, at: row.at, ...record }] : [];
  });
};

// The account's recent sign-ins for the profile page
export const recentSignIns = async (userId: string, limit = 10): Promise<SignInEntry[]> => {
  await ensureSchema();
  return entries(userId, limit);
};

// Pushes a warning to the account's devices about a sign-in from a new one
const warn = async (userId: string, record: SignInRecord): Promise<void> => {
  const res = await getPool().query<{ locale: string | null }>(`SELECT locale FROM settings WHERE user_id = $1`, [
    userId,
  ]);
  const stored = res.rows[0]?.locale;
  const locale: Locale = isLocale(stored) ? stored : "en";
  const i18n = makeI18n(locale, serverMessages(locale));
  await pushTo(userId, {
    title: i18n.t("push.signin.title"),
    body: [[record.device, record.ip].filter(Boolean).join(" · "), i18n.t("push.signin.body")].join("\n"),
    url: "/profile",
    tag: `sign-in-${Date.now()}`,
  });
};

// Records a sign-in, warns about unfamiliar devices and returns the record's id
export const noteSignIn = async (userId: string, method: SignInMethod): Promise<string | undefined> => {
  try {
    await ensureSchema();
    const h = await headers().catch(() => null);
    const record: SignInRecord = {
      method,
      device: deviceLabel(h?.get("user-agent")),
      ip: clientAddress(h?.get("x-forwarded-for"), h?.get("x-real-ip")).slice(0, 64),
    };
    const earlier = await entries(userId, KEEP);
    const since = Date.now() - FAMILIAR_MS;
    const familiar = earlier.some((e) => e.device === record.device && Date.parse(e.at) >= since);
    const res = await getPool().query<{ id: string }>(
      `INSERT INTO sign_ins (user_id, secret) VALUES ($1, $2) RETURNING id::text AS id`,
      [userId, sealRecord(record, sealedIn.signIn(userId))],
    );
    await getPool().query(
      `DELETE FROM sign_ins WHERE user_id = $1 AND id NOT IN (SELECT id FROM sign_ins WHERE user_id = $1 ORDER BY at DESC, id DESC LIMIT $2)`,
      [userId, KEEP],
    );
    if (earlier.length > 0 && !familiar && record.device) void warn(userId, record).catch(() => {});
    return res.rows[0]?.id;
  } catch {
    return undefined;
  }
};
