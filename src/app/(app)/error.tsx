"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { reportClientError } from "@/features/settings/api/serverErrors";
import { useI18n } from "@/shared/i18n/useI18n";
import Button from "@/shared/ui/Button/Button";
import LinkButton from "@/shared/ui/LinkButton/LinkButton";
import ProblemPanel from "@/widgets/ProblemPanel/ProblemPanel";

interface PageErrorProps {
  error: unknown;
  retry: () => void;
}

// Stands in for a page that broke while it drew, inside the app's frame
const PageError = ({ error, retry }: PageErrorProps) => {
  const { t } = useI18n();
  const pathname = usePathname();

  // Puts the failure in the owner's server problems, once per error
  useEffect(() => {
    void reportClientError(error, pathname);
  }, [error, pathname]);

  return (
    <ProblemPanel
      icon="warning"
      title={t("errorPage.title")}
      body={t("errorPage.body")}
      actions={
        <>
          <Button onClick={retry}>{t("shell.tryAgain")}</Button>
          <LinkButton href="/" variant="ghost">
            {t("errorPage.home")}
          </LinkButton>
        </>
      }
    />
  );
};

export default PageError;
