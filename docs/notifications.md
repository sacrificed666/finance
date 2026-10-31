# 🔔 Notifications

Once a day the server can send each device you choose a short note about what is due: planned payments and income, taxes, and money someone owes you. It uses the browser's own push channel, so the note arrives with the app closed.

## 📋 What the morning note lists

| Item                      | When it appears                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| Planned payment or income | A recurring payment or subscription posting dated today or tomorrow, until a bank import takes its place  |
| Tax                       | An unpaid tax-calendar item, three days before its deadline and on the day itself                         |
| Money owed to you         | A receivable due today, while part of it is still outstanding                                             |
| Credit card grace period  | What a card with a credit limit has to pay back by the month's end, three days before and on the last day |

The note shows up to five lines, nearest first (taxes before payments on the same day), and counts the rest ("…and 2 more"). It is written in the language chosen in Settings. Tapping it opens the Income page when a tax is listed, otherwise the Calendar. Days with nothing due send nothing.

## 🗞️ Weekly or monthly summary

**Settings → Notifications → Summary** asks for one more note beside the morning one, off unless chosen (`settings.notify.summary`):

| Choice  | Arrives                  | Covers                     | Set against         |
| ------- | ------------------------ | -------------------------- | ------------------- |
| Weekly  | Mondays at the note hour | Monday to Sunday just past | The week before it  |
| Monthly | The 1st at the note hour | The month just past        | The month before it |

It lists what was spent, how much more or less than the period before (left out under 1%), what came in and the category with the most spending, in the base currency at each entry's month rate; entries left out of reports and transfers do not count. Tapping it opens Reports. A period with no money moving sends nothing (`features/notifications/model/summary.ts`).

## ⚡ As it happens

With automatic Monobank import on, two more kinds of note arrive the moment the bank reports an operation, each with its own switch under the device switch. The switches belong to the account (`settings.notify`), so every device that gets notes follows them.

| Note                  | When                                                                                                                                | Tap opens                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| New bank operation    | Every payment or income the webhook books, with its amount, merchant, category and account; not transfers between your own accounts | The entry, to change its category |
| Budget at 80% or 100% | When an operation takes a budget (its category and subcategories together) past either mark for the month                           | Expenses                          |

A budget speaks up once per mark: the check compares the budget before and after the operation, so an operation that fills in a planned payment of the same size changes nothing (`features/notifications/model/alerts.ts`).

One note needs no switch: a sign-in from a browser and system the account has not used in the last 180 days, see [Security](./security.md#-recent-sign-ins-and-signing-out-everywhere).

## 📱 Turning it on

**Settings → Notifications → Reminders on this device.** The browser asks for permission once, and each device is switched on separately. **Send a test** checks the whole chain in a few seconds.

| Where                                          | What it takes                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| Chrome, Edge, Firefox on a computer or Android | Works in the installed app and in a tab                             |
| iPhone and iPad (iOS 16.4 or later)            | Only in the app added to the Home Screen                            |
| Development server                             | Not available: the service worker runs in the production build only |

## ⚙️ How it works

| Piece          | Where                                                                                                                                                                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schedule       | `src/instrumentation.ts` starts a timer with the server; every 15 minutes it calls `POST /api/push/remind` on the same server                                                                                                                       |
| Once a day     | From `REMINDER_HOUR` on, each account with a device is marked in `users.reminded_on` before its note is built, so a restart or a second tick never sends it twice; when no device took the notes, the mark is cleared and the next tick tries again |
| Content        | `features/notifications/model/reminders.ts` builds the lines from the saved state, `summary.ts` the weekly or monthly summary                                                                                                                       |
| Delivery       | `features/notifications/model/webPush.ts` encrypts the message for the device (RFC 8291) and signs the request (VAPID, RFC 8292)                                                                                                                    |
| Devices        | `push_subscriptions`, one sealed row per device. A device the push service no longer knows (`403`, `404`, `410`) is removed                                                                                                                         |
| Service worker | `public/sw.js` shows the note and opens the page it points to                                                                                                                                                                                       |

The VAPID key pair is derived from `DATA_ENCRYPTION_KEY` (or from `AUTH_SECRET` when it is missing), so there is nothing extra to configure. Changing that secret changes the key: devices stop receiving notes, switch themselves off the next time Settings is opened, and can be turned on again there.

| Variable        | Meaning                                                                            |
| --------------- | ---------------------------------------------------------------------------------- |
| `REMINDER_HOUR` | Hour of the day the note goes out (default `9`), in `TZ`, `Europe/Kyiv` unless set |
| `REMINDERS`     | `off` stops the timer; an external scheduler can still call the route              |
| `VAPID_SUBJECT` | The contact push services see; defaults to `mailto:` and `OWNER_EMAIL`             |

> [!NOTE]
> `POST /api/push/remind` has no session. It needs the `x-remind-token` header, an HMAC of `AUTH_SECRET`, and answers `404` without it.

> [!IMPORTANT]
> A note carries names and amounts. It travels through the browser vendor's push service (Google, Mozilla, Apple or Microsoft) encrypted for the device, so the service relays bytes it cannot read. The server accepts devices on those services only.
