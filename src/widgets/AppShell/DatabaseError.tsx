"use client";

import { useI18n } from "@/shared/i18n/useI18n";
import Button from "@/shared/ui/Button/Button";
import ProblemPanel from "@/widgets/ProblemPanel/ProblemPanel";

interface DatabaseErrorProps {
  message: string;
  onRetry: () => void;
}

// Stands in for the page when the server could not load the account from Postgres
const DatabaseError = ({ message, onRetry }: DatabaseErrorProps) => {
  const { t } = useI18n();
  const [before, after] = t("shell.dbBody").split("{env}");
  return (
    <ProblemPanel
      icon="plug"
      title={t("shell.dbTitle")}
      body={
        <>
          {before}
          <code>DATABASE_URL</code>
          {after}
        </>
      }
      detail={message}
      actions={<Button onClick={onRetry}>{t("shell.tryAgain")}</Button>}
    />
  );
};

export default DatabaseError;
