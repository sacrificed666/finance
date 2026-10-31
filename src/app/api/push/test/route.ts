import { NextResponse } from "next/server";

import { currentUserId } from "@/features/auth/model/currentUser";
import { pushTo, testMessage } from "@/features/notifications/model/push";
import { failure, jsonBody, notSignedIn, tooMany } from "@/shared/api/http";
import { readText } from "@/shared/lib/guards";
import { clientKey, rateLimit } from "@/shared/lib/rateLimit";

export const dynamic = "force-dynamic";

// Sends a test notification to one of the account's devices
export const POST = async (request: Request) => {
  const id = await currentUserId();
  if (!id) return notSignedIn();
  const limit = rateLimit(clientKey(request, `push-test:${id}`), 5, 15 * 60_000);
  if (!limit.allowed) return tooMany("wait", limit.retryAfterSeconds);
  const endpoint = readText(await jsonBody(request), "endpoint");
  if (endpoint === null) return failure("endpoint", 400);
  const result = await pushTo(id, await testMessage(id), endpoint);
  return result.sent > 0 ? NextResponse.json({ ok: true }) : failure("failed", 502);
};
