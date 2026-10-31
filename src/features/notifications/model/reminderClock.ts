import { createHmac } from "node:crypto";

const EVERY_MS = 15 * 60_000;

declare global {
  // The reminder timer, kept across hot reloads in development
  var financeReminderClock: ReturnType<typeof setInterval> | undefined;
}

// The token the reminder clock proves itself with
export const remindToken = (secret: string): string =>
  createHmac("sha256", secret).update("finance-tracker:push-remind").digest("base64url");

// Calls the digest route every 15 minutes, once per server, unless turned off
export const startReminderClock = (): void => {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || globalThis.financeReminderClock || process.env.REMINDERS === "off") return;
  const port = process.env.PORT?.trim() ? process.env.PORT.trim() : "3000";
  const url = `http://127.0.0.1:${port}/api/push/remind`;
  // Asks the server to send the digests that are due
  const tick = () => {
    void fetch(url, { method: "POST", headers: { "x-remind-token": remindToken(secret) } }).catch(() => {});
  };
  globalThis.financeReminderClock = setInterval(tick, EVERY_MS);
  globalThis.financeReminderClock.unref();
  setTimeout(tick, 60_000).unref();
};
