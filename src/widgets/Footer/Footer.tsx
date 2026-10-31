"use client";

import { useI18n } from "@/shared/i18n/useI18n";
import { SITE } from "@/shared/lib/site";
import ExternalLink from "@/shared/ui/ExternalLink/ExternalLink";

import styles from "./Footer.module.scss";

// The year for the copyright line
const currentYear = (): number => new Date().getFullYear();

// Author, version, the source of prices and the source code
const Footer = () => {
  const { t } = useI18n();
  return (
    <footer className={styles.footer}>
      <div className={styles.bar}>
        <p className={styles.owner}>
          © {currentYear()} {SITE.author.name}
          <span aria-hidden="true">·</span>
          <ExternalLink href={SITE.changelog} icon={false}>
            v{SITE.version}
          </ExternalLink>
        </p>
        <p className={styles.links}>
          <span>
            {t("footer.prices")}:{" "}
            <ExternalLink href="https://www.coingecko.com" icon={false}>
              CoinGecko
            </ExternalLink>
          </span>
          <ExternalLink href={SITE.repository} icon={false}>
            {t("footer.source")}
          </ExternalLink>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
