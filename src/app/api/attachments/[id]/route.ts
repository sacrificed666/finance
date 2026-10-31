import { NextResponse } from "next/server";

import { currentUserId } from "@/features/auth/model/currentUser";
import { loadAttachment } from "@/features/transactions/api/attachments";
import { failure, notSignedIn } from "@/shared/api/http";

export const dynamic = "force-dynamic";

// One of the account's receipt photos, cached privately for a day
export const GET = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const userId = await currentUserId();
  if (!userId) return notSignedIn();
  const { id } = await params;
  if (!/^[\w-]{1,60}$/u.test(id)) return failure("Bad id.", 400);
  const file = await loadAttachment(userId, id);
  if (!file) return failure("Not found.", 404);
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
