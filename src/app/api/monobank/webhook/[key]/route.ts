import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { loadState, saveChanges } from "@/features/data/api/repo";
import { diffState } from "@/features/data/model/changes";
import { findMonoByWebhookKey, monoDate, monoItem, recordMonoBalance } from "@/features/import/api/monobank";
import { absorbOperation, candidateFromMono } from "@/features/import/model/import";
import { budgetCrossings, operationMessage } from "@/features/notifications/model/alerts";
import { pushTo } from "@/features/notifications/model/push";
import { logError } from "@/features/settings/api/errorLog";
import { serverMessages } from "@/shared/i18n/server";
import { makeI18n } from "@/shared/i18n/translate";
import { readRecord, readString } from "@/shared/lib/guards";
import { clientKey, rateLimit } from "@/shared/lib/rateLimit";

export const dynamic = "force-dynamic";

// Monobank checks the address with a GET before it sends anything
export const GET = () => new NextResponse(null, { status: 200 });

// The work queued for each account, so its operations are booked one at a time
const queues = new Map<string, Promise<unknown>>();

// Runs the work after the account's earlier work, whether that failed or not
const inTurn = <T>(userId: string, work: () => Promise<T>): Promise<T> => {
  const previous = queues.get(userId) ?? Promise.resolve();
  const next = previous.then(work, work);
  queues.set(
    userId,
    next
      .catch(() => {})
      .finally(() => {
        if (queues.get(userId) === next) queues.delete(userId);
      }),
  );
  return next;
};

// Books an operation the bank reports and pushes what the account asked for
export const POST = async (request: Request, { params }: { params: Promise<{ key: string }> }) => {
  if (!rateLimit(clientKey(request, "mono-webhook"), 120, 60_000).allowed) {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }
  const { key } = await params;
  const found = await findMonoByWebhookKey(key);
  if (!found) return NextResponse.json({ error: "unknown" }, { status: 404 });

  const body: unknown = await request.json().catch(() => null);
  const data = readRecord(body, "data");
  const item = monoItem(data?.statementItem);
  if (readString(body, "type") !== "StatementItem" || !item) return NextResponse.json({ ok: true });
  const accountId = readString(data, "account");
  const account = found.stored.accounts?.find((entry) => entry.id === accountId);
  const currency = account?.currency;
  if (!account || !currency) return NextResponse.json({ ok: true });

  try {
    await inTurn(found.userId, async () => {
      await recordMonoBalance(found.userId, account.id, [item]);
      const { state } = await loadState(found.userId);
      const linked = state.settings.bankLinks?.[account.id];
      if (!linked) return;
      const candidate = candidateFromMono(state, item, currency, linked, monoDate(item.time));
      const next = absorbOperation(state, candidate, randomUUID);
      if (next === state) return;
      await saveChanges(found.userId, diffState(state, next), null);
      const booked = next.transactions.find((tx) => tx.externalId === candidate.externalId);
      if (!booked || booked.type === "transfer") return;
      const notify = next.settings.notify ?? {};
      const i18n = makeI18n(next.settings.locale, serverMessages(next.settings.locale));
      const messages = [
        ...(notify.operations === false ? [] : [operationMessage(next, booked, i18n)]),
        ...(notify.budgets === false ? [] : budgetCrossings(state, next, booked, i18n)),
      ];
      await Promise.all(messages.map((message) => pushTo(found.userId, message).catch(() => {})));
    });
  } catch (error) {
    await logError("api/monobank/webhook/[key]", error);
    return NextResponse.json({ error: "not saved" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
};
