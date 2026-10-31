import { NextResponse } from "next/server";

import { currentUserId } from "@/features/auth/model/currentUser";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, saveAttachment } from "@/features/transactions/api/attachments";
import { failure, jsonBody, notSignedIn } from "@/shared/api/http";
import { readText } from "@/shared/lib/guards";
import { rateLimit } from "@/shared/lib/rateLimit";

export const dynamic = "force-dynamic";

// Stores a receipt photo sent as base64 and returns its id
export const POST = async (request: Request) => {
  const userId = await currentUserId();
  if (!userId) return notSignedIn();
  if (!rateLimit(`attach:${userId}`, 30, 60_000).allowed) return failure("Too many uploads, wait a minute.", 429);

  const body = await jsonBody(request);
  if (body === null) return failure("Body must be valid JSON", 400);
  const mime = readText(body, "mime") ?? "";
  const encoded = readText(body, "data");
  if (!ATTACHMENT_TYPES.has(mime) || encoded === null) return failure("Send a WebP, JPEG or PNG image.", 400);
  const data = Buffer.from(encoded, "base64");
  if (data.length === 0 || data.length > ATTACHMENT_MAX_BYTES) return failure("The image is empty or too large.", 413);
  const id = await saveAttachment(userId, mime, data);
  return id ? NextResponse.json({ id }) : failure("There is no room for more photos in this account.", 507);
};
