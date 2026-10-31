import { requestLocale, serverT } from "@/shared/i18n/server";
import LinkButton from "@/shared/ui/LinkButton/LinkButton";
import ProblemPanel from "@/widgets/ProblemPanel/ProblemPanel";

import styles from "./not-found.module.scss";

// Answers an address the app does not have, in the visitor's language
const NotFound = async () => {
  const t = serverT(await requestLocale());
  return (
    <main className={styles.page}>
      <title>{t("notFound.title")}</title>
      <ProblemPanel
        icon="search"
        title={t("notFound.title")}
        body={t("notFound.body")}
        actions={<LinkButton href="/">{t("errorPage.home")}</LinkButton>}
      />
    </main>
  );
};

export default NotFound;
