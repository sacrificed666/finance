import { NextResponse } from "next/server";

import { auth } from "@/features/auth/model/auth";
import { recentSignIns } from "@/features/auth/model/signIns";
import { notSignedIn } from "@/shared/api/http";

export const dynamic = "force-dynamic";

// The account's recent sign-ins and which of them is this one
export const GET = async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return notSignedIn();
  return NextResponse.json({ current: session.signInId ?? null, entries: await recentSignIns(id) });
};
