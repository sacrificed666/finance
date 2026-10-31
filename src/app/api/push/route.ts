import { NextResponse } from "next/server";

import { currentUserId } from "@/features/auth/model/currentUser";
import { pushKey, REMINDER_HOUR, removeDevice, saveDevice } from "@/features/notifications/model/push";
import { failure, jsonBody, notSignedIn } from "@/shared/api/http";
import { isRecord, readText } from "@/shared/lib/guards";

export const dynamic = "force-dynamic";

// The public key devices subscribe with and the hour reminders go out
export const GET = async () => {
  if (!(await currentUserId())) return notSignedIn();
  return NextResponse.json({ key: pushKey(), hour: REMINDER_HOUR });
};

// Keeps a device's push subscription
export const PUT = async (request: Request) => {
  const id = await currentUserId();
  if (!id) return notSignedIn();
  const body = await jsonBody(request);
  const saved = await saveDevice(id, isRecord(body) ? body.subscription : null);
  return saved ? NextResponse.json({ ok: true }) : failure("subscription", 400);
};

// Forgets a device's push subscription
export const DELETE = async (request: Request) => {
  const id = await currentUserId();
  if (!id) return notSignedIn();
  const endpoint = readText(await jsonBody(request), "endpoint");
  if (endpoint === null) return failure("endpoint", 400);
  await removeDevice(id, endpoint);
  return NextResponse.json({ ok: true });
};
