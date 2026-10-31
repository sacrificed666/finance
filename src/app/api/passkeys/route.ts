import { NextResponse } from "next/server";

import { currentUserId } from "@/features/auth/model/currentUser";
import { finishRegistration, listPasskeys, removePasskey } from "@/features/auth/model/passkeys";
import { failure, jsonBody, notSignedIn } from "@/shared/api/http";
import { deviceLabel } from "@/shared/lib/device";
import { readRecord, readString } from "@/shared/lib/guards";

export const dynamic = "force-dynamic";

// The account's passkeys
export const GET = async () => {
  const id = await currentUserId();
  if (!id) return notSignedIn();
  return NextResponse.json({ passkeys: await listPasskeys(id) });
};

// Adds a passkey the browser made, named after the device
export const POST = async (request: Request) => {
  const id = await currentUserId();
  if (!id) return notSignedIn();
  const response = readRecord(await jsonBody(request), "response");
  if (!response) return failure("response", 400);
  const saved = await finishRegistration(id, response, deviceLabel(request.headers.get("user-agent")));
  return saved ? NextResponse.json({ passkeys: await listPasskeys(id) }) : failure("verify", 400);
};

// Removes one of the account's passkeys
export const DELETE = async (request: Request) => {
  const id = await currentUserId();
  if (!id) return notSignedIn();
  const passkey = readString(await jsonBody(request), "id");
  if (passkey === null) return failure("id", 400);
  await removePasskey(id, passkey);
  return NextResponse.json({ passkeys: await listPasskeys(id) });
};
