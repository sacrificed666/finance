import { tokenMatches } from "@/features/calendar/api/feedToken";
import { feedEvents } from "@/features/calendar/model/feedEvents";
import { loadState } from "@/features/data/api/repo";
import { logError } from "@/features/settings/api/errorLog";
import { failure } from "@/shared/api/http";
import { serverMessages } from "@/shared/i18n/server";
import { makeI18n } from "@/shared/i18n/translate";
import { todayISO } from "@/shared/lib/date";
import { icsCalendar } from "@/shared/lib/ics";
import { rateLimit } from "@/shared/lib/rateLimit";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

// How often one link may be read in an hour, more than any calendar app asks
const READS_AN_HOUR = 60;

// A link's file name: its number, the token and the extension
const FILE = /^(\d{1,9})\.([\w-]{32})(?:\.ics)?$/u;

// The account's coming dates as a calendar file, for the link its settings name
export const GET = async (_request: Request, { params }: { params: Promise<{ user: string; token: string }> }) => {
  const { user, token: file } = await params;
  const [, number = "", token = ""] = FILE.exec(file) ?? [];
  const feed = Number(number);
  const secret = process.env.AUTH_SECRET?.trim();
  // A forged or broken link is turned away before the database is touched
  if (!secret || !UUID.test(user) || !token || !tokenMatches(secret, user, feed, token)) {
    return failure("Not found.", 404);
  }
  if (!rateLimit(`calendar:${user}`, READS_AN_HOUR, 3_600_000).allowed) return failure("Too many requests.", 429);
  try {
    const { state } = await loadState(user);
    const link = state.settings.calendar;
    if (!link?.on || link.feed !== feed) return failure("Not found.", 404);
    const i18n = makeI18n(state.settings.locale, serverMessages(state.settings.locale));
    const body = icsCalendar("Finance", feedEvents(state, todayISO(), i18n), new Date());
    return new Response(body, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="finance.ics"',
        "Cache-Control": "private, max-age=900",
      },
    });
  } catch (error) {
    await logError("calendar feed", error);
    return failure("The calendar could not be read. Try again later.", 500);
  }
};
