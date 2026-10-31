import { NextResponse } from "next/server";

import { currentUserId } from "@/features/auth/model/currentUser";
import { endAllSessions } from "@/features/auth/model/sessions";
import { notSignedIn } from "@/shared/api/http";

export const dynamic = "force-dynamic";

// Signs the account out on every device
export const DELETE = async () => {
  const id = await currentUserId();
  if (!id) return notSignedIn();
  await endAllSessions(id);
  return NextResponse.json({ ok: true });
};
