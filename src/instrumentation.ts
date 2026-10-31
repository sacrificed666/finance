import type { Instrumentation } from "next";

// Prepares the database and starts the reminder clock when the server boots
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [{ ensureSchema }, { startReminderClock }] = await Promise.all([
      import("@/shared/api/db"),
      import("@/features/notifications/model/reminderClock"),
    ]);
    // A database that is not up yet gets the schema on the first request instead
    if (process.env.DATABASE_URL) await ensureSchema().catch(() => {});
    startReminderClock();
  }
}

// Keeps every server error for the owner's settings page
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logError } = await import("@/features/settings/api/errorLog");
    const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
    await logError(`${request.method} ${context.routePath}`, err, digest);
  }
};
