"use client";

import CalendarFeedCard from "@/features/calendar/ui/CalendarFeedCard/CalendarFeedCard";
import ImportCard from "@/features/import/ui/ImportCard/ImportCard";
import NotificationsCard from "@/features/notifications/ui/NotificationsCard/NotificationsCard";
import CategoriesCard from "@/features/settings/ui/CategoriesCard/CategoriesCard";
import DataCard from "@/features/settings/ui/DataCard/DataCard";
import GeneralCard from "@/features/settings/ui/GeneralCard/GeneralCard";
import RatesCard from "@/features/settings/ui/RatesCard/RatesCard";
import RulesCard from "@/features/settings/ui/RulesCard/RulesCard";
import ServerErrorsCard from "@/features/settings/ui/ServerErrorsCard/ServerErrorsCard";
import SettingsHero from "@/features/settings/ui/SettingsHero/SettingsHero";
import TaxCard from "@/features/settings/ui/TaxCard/TaxCard";
import { useI18n } from "@/shared/i18n/useI18n";
import PageBody from "@/shared/ui/PageBody/PageBody";
import PageHeader from "@/shared/ui/PageHeader/PageHeader";
import SectionNav from "@/shared/ui/SectionNav/SectionNav";
import Split from "@/shared/ui/Split/Split";

// Settings: section chips, categories, imports, rules, the app, taxes, data
const SettingsPage = () => {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t("settings.title")} />
      <PageBody>
        <SectionNav
          label={t("settings.sections")}
          sections={[
            { id: "general", label: t("settings.general.title") },
            { id: "taxes", label: t("settings.tax.title") },
            { id: "categories", label: t("settings.categories.title") },
            { id: "import", label: t("import.title") },
            { id: "rules", label: t("rules.title") },
            { id: "notifications", label: t("settings.push.title") },
            { id: "calendar", label: t("calendarFeed.title") },
            { id: "rates", label: t("settings.rates.title") },
            { id: "data", label: t("settings.data.title") },
          ]}
        />
        <SettingsHero />
        <Split
          sideFirst
          main={
            <>
              <CategoriesCard />
              <ImportCard />
              <RulesCard />
            </>
          }
          side={
            <>
              <GeneralCard />
              <TaxCard />
              <NotificationsCard />
              <CalendarFeedCard />
              <ServerErrorsCard />
              <RatesCard />
              <DataCard />
            </>
          }
        />
      </PageBody>
    </>
  );
};

export default SettingsPage;
