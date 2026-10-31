import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// The secret part of an account's calendar link for one of its link numbers
export const feedToken = (secret: string, userId: string, feed: number): string =>
  createHmac("sha256", secret)
    .update(`finance-tracker:calendar:${userId}:${String(feed)}`)
    .digest("base64url")
    .slice(0, 32);

// Whether a link's token is the one an account's current link number gives
export const tokenMatches = (secret: string, userId: string, feed: number, token: string): boolean => {
  const wanted = Buffer.from(feedToken(secret, userId, feed));
  const given = Buffer.from(token);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
};

// The path of an account's calendar file, its link number before the token
export const feedPath = (secret: string, userId: string, feed: number): string =>
  `/api/calendar/${userId}/${String(feed)}.${feedToken(secret, userId, feed)}.ics`;
