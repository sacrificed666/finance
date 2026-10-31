import "server-only";
import { clientAddress } from "@/shared/lib/device";

interface Bucket {
  hits: number;
  resetAt: number;
}

// The hits of each key in its current window
const buckets = new Map<string, Bucket>();

// Drops ended windows once there are many of them
const sweep = (now: number): void => {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
};

export interface RateVerdict {
  allowed: boolean;
  retryAfterSeconds: number;
}

// Counts a hit for the key and says whether it is still within the limit
export const rateLimit = (key: string, limit: number, windowMs: number): RateVerdict => {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  bucket.hits++;
  if (bucket.hits > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
};

// A rate limit key of the scope and the visitor's address
export const clientKey = (request: Request, scope: string): string => {
  const ip = clientAddress(request.headers.get("x-forwarded-for"), request.headers.get("x-real-ip"));
  return `${scope}:${ip === "" ? "local" : ip}`;
};
