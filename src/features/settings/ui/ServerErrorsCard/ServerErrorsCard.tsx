"use client";

import { useEffect, useState } from "react";

import { clearServerErrors, fetchServerErrors, type ServerErrors } from "@/features/settings/api/serverErrors";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDateShort, formatTime } from "@/shared/lib/date";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";

import styles from "./ServerErrorsCard.module.scss";

// The errors the server logged, each opening to its whole message
const ServerErrorsCard = () => {
  const { t, tp } = useI18n();
  const [data, setData] = useState<ServerErrors | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  // Loads the log once, unless the card goes away first
  useEffect(() => {
    let alive = true;
    void fetchServerErrors().then((log) => {
      if (alive) setData(log);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!data || data.total === 0) return null;

  // Clears the log on the server and here
  const clear = async () => {
    if (await clearServerErrors()) setData({ errors: [], total: 0 });
  };

  return (
    <Card
      title={t("errors.title")}
      subtitle={tp("errors.subtitle", data.total)}
      icon="warning"
      action={
        <Button variant="ghost" size="sm" onClick={() => void clear()}>
          {t("errors.clear")}
        </Button>
      }
    >
      <p className={styles.hint}>{t("errors.hint")}</p>
      <ul className={styles.rows}>
        {data.errors.map((error, index) => (
          <li key={`${error.at}-${String(index)}`}>
            <button type="button" onClick={() => setOpen(open === index ? null : index)} className={styles.row}>
              <span className={styles.head}>
                <span className={styles.route}>{error.route}</span>
                <span className={styles.when}>
                  {formatDateShort(error.at.slice(0, 10))}, {formatTime(error.at)}
                </span>
              </span>
              <span className={cx(styles.message, open === index ? styles.whole : styles.short)}>{error.message}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default ServerErrorsCard;
