import { NextResponse } from "next/server";

import { auth } from "@/features/auth/model/auth";
import { loginOptions, registrationOptions } from "@/features/auth/model/passkeys";
import { failure, jsonBody, notSignedIn } from "@/shared/api/http";
import { readText } from "@/shared/lib/guards";
import { clientKey, rateLimit } from "@/shared/lib/rateLimit";

export const dynamic = "force-dynamic";

// The options for signing in with a passkey or adding one
export const POST = async (request: Request) => {
  const purpose = readText(await jsonBody(request), "purpose");
  if (purpose === "login") {
    if (!rateLimit(clientKey(request, "passkey-options"), 30, 15 * 60_000).allowed) return failure("wait", 429);
    return NextResponse.json(await loginOptions());
  }
  if (purpose === "register") {
    const session = await auth();
    const id = session?.user?.id;
    if (!id) return notSignedIn();
    return NextResponse.json(await registrationOptions(id, session.user?.email ?? id, session.user?.name ?? ""));
  }
  return failure("purpose", 400);
};
