import { NextResponse } from "next/server";

import { auth } from "@/features/auth/model/auth";
import { beginTwoFactor, confirmTwoFactor, disableTwoFactor } from "@/features/auth/model/twoFactor";
import { failure, jsonBody, notSignedIn, tooMany } from "@/shared/api/http";
import { readText } from "@/shared/lib/guards";
import { clientKey, rateLimit } from "@/shared/lib/rateLimit";

export const dynamic = "force-dynamic";

// Starts, confirms or turns off two-factor sign-in
export const POST = async (request: Request) => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return notSignedIn();

  const body = await jsonBody(request);
  const action = readText(body, "action");
  const code = readText(body, "code") ?? "";

  if (action === "begin") {
    const started = await beginTwoFactor(id, session.user?.email ?? "account");
    return started ? NextResponse.json(started) : failure("enabled", 409);
  }

  const limit = rateLimit(clientKey(request, `two-factor:${id}`), 10, 15 * 60_000);
  if (!limit.allowed) return tooMany("wait", limit.retryAfterSeconds);

  if (action === "confirm") {
    const recovery = await confirmTwoFactor(id, code);
    return recovery ? NextResponse.json({ recovery }) : failure("code", 400);
  }
  if (action === "disable") {
    return (await disableTwoFactor(id, code)) ? NextResponse.json({ ok: true }) : failure("code", 400);
  }
  return failure("action", 400);
};
