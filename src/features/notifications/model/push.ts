import "server-only";
import { createHash } from "node:crypto";

import { OWNER_EMAIL } from "@/features/auth/model/authConfig";
import { loadState } from "@/features/data/api/repo";
import { dueReminders, reminderMessage, type PushMessage } from "@/features/notifications/model/reminders";
import { summaryMessage } from "@/features/notifications/model/summary";
import {
  base64url,
  isSubscription,
  sendPush,
  vapidFromSeed,
  type PushSubscriptionKeys,
  type VapidKeys,
} from "@/features/notifications/model/webPush";
import { logError } from "@/features/settings/api/errorLog";
import { ensureSchema, getPool } from "@/shared/api/db";
import type { Locale } from "@/shared/i18n/locales";
import { serverMessages } from "@/shared/i18n/server";
import { makeI18n, type I18n } from "@/shared/i18n/translate";
import { openRecord, sealedIn, sealRecord } from "@/shared/lib/secrets";
import { mapInOrder } from "@/shared/lib/sequence";

// The first setting with something in it
const firstSet = (...values: Array<string | undefined>): string | undefined =>
  values.map((value) => value?.trim()).find((value) => value !== undefined && value !== "");

const seed = firstSet(process.env.DATA_ENCRYPTION_KEY, process.env.AUTH_SECRET);

// The VAPID keys this server signs with, derived from its secret
const vapid: VapidKeys | null = seed
  ? vapidFromSeed(createHash("sha256").update(`finance-tracker:vapid:${seed}`).digest())
  : null;

// The contact the push services see: the setting, the owner or the site
const fallbackSubject = process.env.AUTH_URL?.startsWith("https://")
  ? process.env.AUTH_URL
  : "mailto:owner@example.com";
const subject = firstSet(process.env.VAPID_SUBJECT) ?? (OWNER_EMAIL ? `mailto:${OWNER_EMAIL}` : fallbackSubject);

// The hour of the day digests go out, 9 unless set
export const REMINDER_HOUR = Math.min(23, Math.max(0, Number(process.env.REMINDER_HOUR ?? 9) || 0));
const TIME_ZONE = firstSet(process.env.TZ) ?? "Europe/Kyiv";

// A short stable id of a device from its push address
const deviceId = (endpoint: string) => createHash("sha256").update(endpoint).digest("base64url").slice(0, 32);

// The public key browsers subscribe with, or null when pushes are off
export const pushKey = (): string | null => (vapid ? base64url(vapid.publicKey) : null);

// Keeps a device's subscription sealed; false when it is not a valid one
export const saveDevice = async (userId: string, subscription: unknown): Promise<boolean> => {
  if (!isSubscription(subscription)) return false;
  await ensureSchema();
  const record: PushSubscriptionKeys = { endpoint: subscription.endpoint, keys: subscription.keys };
  await getPool().query(
    `INSERT INTO push_subscriptions (user_id, id, secret) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, id) DO UPDATE SET secret = EXCLUDED.secret`,
    [userId, deviceId(record.endpoint), sealRecord(record, sealedIn.push(userId, deviceId(record.endpoint)))],
  );
  return true;
};

// Forgets a device
export const removeDevice = async (userId: string, endpoint: string): Promise<void> => {
  await ensureSchema();
  await getPool().query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND id = $2`, [userId, deviceId(endpoint)]);
};

// The account's devices whose subscriptions open
const devices = async (userId: string): Promise<Array<{ id: string; subscription: PushSubscriptionKeys }>> => {
  await ensureSchema();
  const res = await getPool().query<{ id: string; secret: string }>(
    `SELECT id, secret FROM push_subscriptions WHERE user_id = $1`,
    [userId],
  );
  return res.rows.flatMap((row) => {
    const subscription = openRecord(row.secret, sealedIn.push(userId, row.id));
    return isSubscription(subscription) ? [{ id: row.id, subscription }] : [];
  });
};

// Sends a message to the account's devices, or one of them, forgetting gone ones
export const pushTo = async (
  userId: string,
  message: PushMessage,
  endpoint?: string,
): Promise<{ sent: number; failed: number }> => {
  const keys = vapid;
  if (!keys) return { sent: 0, failed: 0 };
  const targets = (await devices(userId)).filter((d) => !endpoint || d.subscription.endpoint === endpoint);
  const results = await mapInOrder(targets, async (device) => {
    const result = await sendPush(device.subscription, message, keys, subject);
    if (result === "gone") {
      await getPool().query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND id = $2`, [userId, device.id]);
    }
    return result;
  });
  const sent = results.filter((result) => result === "sent").length;
  return { sent, failed: results.length - sent };
};

// The translations of the account's language
const i18nFor = (locale: Locale): I18n => makeI18n(locale, serverMessages(locale));

// The test notification in the account's language
export const testMessage = async (userId: string): Promise<PushMessage> => {
  const { state } = await loadState(userId);
  const i18n = i18nFor(state.settings.locale);
  return {
    title: i18n.t("push.test.title"),
    body: i18n.t("push.test.body", { hour: String(REMINDER_HOUR) }),
    url: "/settings",
    tag: "test",
  };
};

// The date and hour now in the reminders' time zone
const localNow = (now: Date): { date: string; hour: number } => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year ?? ""}-${parts.month ?? ""}-${parts.day ?? ""}`, hour: Number(parts.hour) };
};

// The digest and any summary; when no device took them, tried again later
const digestFor = async (userId: string, date: string): Promise<number> => {
  try {
    const { state } = await loadState(userId);
    const i18n = i18nFor(state.settings.locale);
    const asked = state.settings.notify?.summary;
    const messages = [
      reminderMessage(dueReminders(state, date, i18n), date, i18n),
      asked ? summaryMessage(state, date, asked, i18n) : null,
    ].filter((message): message is PushMessage => message !== null);
    if (messages.length === 0) return 0;
    const results = await mapInOrder(messages, (message) => pushTo(userId, message));
    const sent = results.reduce((sum, result) => sum + result.sent, 0);
    const failed = results.reduce((sum, result) => sum + result.failed, 0);
    if (sent === 0 && failed > 0) {
      await getPool().query(`UPDATE users SET reminded_on = NULL WHERE id = $1 AND reminded_on = $2::date`, [
        userId,
        date,
      ]);
    }
    return sent;
  } catch (error) {
    await logError("push digest", error);
    return 0;
  }
};

// Sends today's digests from the reminder hour on, each account once a day
export const sendDigests = async (now = new Date()): Promise<{ checked: number; sent: number }> => {
  if (!vapid) return { checked: 0, sent: 0 };
  const { date, hour } = localNow(now);
  if (hour < REMINDER_HOUR) return { checked: 0, sent: 0 };
  await ensureSchema();
  const due = await getPool().query<{ id: string }>(
    `UPDATE users SET reminded_on = $1::date
      WHERE (reminded_on IS NULL OR reminded_on < $1::date)
        AND id IN (SELECT DISTINCT user_id FROM push_subscriptions)
      RETURNING id`,
    [date],
  );
  const sent = await mapInOrder(due.rows, ({ id }) => digestFor(id, date));
  return { checked: due.rowCount ?? 0, sent: sent.reduce((sum, n) => sum + n, 0) };
};
