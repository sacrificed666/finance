"use client";

import { useEffect, useState } from "react";

import { useStore } from "@/app/hooks";
import { useI18n } from "@/shared/i18n/useI18n";
import { readString } from "@/shared/lib/guards";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import LinkButton from "@/shared/ui/LinkButton/LinkButton";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./CalendarFeedCard.module.scss";

// The field that shows the link, selected when the clipboard refuses it
const LINK_FIELD = "calendar-link";

// Asks the server for the path of the calendar file of a link number
const fetchPath = async (feed: number): Promise<string | null> => {
  const response = await fetch(`/api/calendar?feed=${String(feed)}`, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;
  return readString(await response.json().catch(() => null), "path") ?? null;
};

// A calendar subscription to planned payments, taxes, debts and grace periods
const CalendarFeedCard = () => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const link = state.settings.calendar;
  const on = link?.on === true;
  const feed = link?.feed ?? 0;
  const [path, setPath] = useState<{ feed: number; path: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const url = on && path?.feed === feed && path.path ? `${window.location.origin}${path.path}` : null;

  // Learns the link whenever its number changes
  useEffect(() => {
    if (!on) return;
    let alive = true;
    void fetchPath(feed).then((next) => {
      if (alive) setPath({ feed, path: next });
    });
    return () => {
      alive = false;
    };
  }, [on, feed]);

  // Turns the link on with a new number, so an old one never comes back
  const setLink = (next: { feed: number; on: boolean }, label: string) => {
    setCopied(false);
    update((s) => ({ ...s, settings: { ...s.settings, calendar: next } }), label);
  };
  // Puts the link on the clipboard, or leaves it selected to copy by hand
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      const field = document.getElementById(LINK_FIELD);
      if (field instanceof HTMLInputElement) field.select();
    }
  };

  return (
    <Card id="calendar" title={t("calendarFeed.title")} subtitle={t("calendarFeed.subtitle")} icon="calendar">
      <div className={styles.body}>
        <p className={styles.hint}>{t("calendarFeed.hint")}</p>
        {on ? (
          <>
            <TextInput
              id={LINK_FIELD}
              readOnly
              aria-label={t("calendarFeed.link")}
              value={url ?? t("common.loading")}
              onFocus={(event) => event.target.select()}
            />
            <div className={styles.actions}>
              <Button size="sm" disabled={!url} onClick={() => void copy()}>
                {copied ? t("calendarFeed.copied") : t("calendarFeed.copy")}
              </Button>
              {url && (
                <LinkButton href={url.replace(/^https?:/u, "webcal:")} variant="ghost" size="sm">
                  {t("calendarFeed.open")}
                </LinkButton>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLink({ feed: feed + 1, on: true }, t("calendarFeed.renewed"))}
              >
                {t("calendarFeed.renew")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setLink({ feed, on: false }, t("calendarFeed.stopped"))}>
                {t("calendarFeed.off")}
              </Button>
            </div>
            <p className={styles.note}>{t("calendarFeed.where")}</p>
          </>
        ) : (
          <Button onClick={() => setLink({ feed: feed + 1, on: true }, t("calendarFeed.made"))}>
            {t("calendarFeed.make")}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default CalendarFeedCard;
