import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { sendDigests } from "@/features/notifications/model/push";
import { remindToken } from "@/features/notifications/model/reminderClock";
import { failure } from "@/shared/api/http";

export const dynamic = "force-dynamic";

// Sends the due daily digests when the reminder clock calls with its token
export const POST = async (request: Request) => {
  const secret = process.env.AUTH_SECRET?.trim();
  const given = Buffer.from(request.headers.get("x-remind-token") ?? "");
  const wanted = Buffer.from(secret ? remindToken(secret) : "");
  if (!secret || given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    return failure("Not found.", 404);
  }
  return NextResponse.json(await sendDigests());
};
