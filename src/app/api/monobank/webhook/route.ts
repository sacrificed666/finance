import { NextResponse } from "next/server";

import { currentUserId } from "@/features/auth/model/currentUser";
import { MonoError, publicMono, setMonoWebhook } from "@/features/import/api/monobank";
import { logError } from "@/features/settings/api/errorLog";
import { failure, jsonBody, notSignedIn } from "@/shared/api/http";
import { isRecord } from "@/shared/lib/guards";

export const dynamic = "force-dynamic";

// Turns live bank updates on at the site's https address, or off
export const POST = async (request: Request) => {
  const userId = await currentUserId();
  if (!userId) return notSignedIn();
  const body = await jsonBody(request);
  const on = isRecord(body) && body.on === true;
  const origin = process.env.AUTH_URL ?? "";
  if (on && !origin.startsWith("https://")) return failure("https", 400);
  try {
    return NextResponse.json(publicMono(await setMonoWebhook(userId, on ? origin : null)));
  } catch (error) {
    if (error instanceof MonoError) return failure(error.message, error.status);
    await logError("api/monobank/webhook", error);
    return failure("unreachable", 502);
  }
};
