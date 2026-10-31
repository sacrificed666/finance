"use client";

import { useStore } from "@/app/hooks";
import { SHORTCUTS_KEY } from "@/features/commands/model/useShortcuts";
import type { ThemePref } from "@/features/data/model/types";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useI18n } from "@/shared/i18n/useI18n";
import { CURRENCY_OPTIONS, type Currency } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import LanguagePicker from "@/shared/ui/LanguagePicker/LanguagePicker";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import SwitchRow from "@/shared/ui/SwitchRow/SwitchRow";

import styles from "./GeneralCard.module.scss";

// The language, the base currency, the theme and this device's keys
const GeneralCard = () => {
  const { state, update } = useStore();
  const { settings } = state;
  const { t } = useI18n();
  const [shortcuts, setShortcuts] = usePersistentState(SHORTCUTS_KEY, true);
  return (
    <Card id="general" title={t("settings.general.title")} subtitle={t("settings.general.subtitle")} icon="gear">
      <div className={styles.fields}>
        <FieldSet label={t("settings.language")} hint={t("settings.language.hint")}>
          <LanguagePicker
            value={settings.locale}
            onChange={(locale) => update((s) => ({ ...s, settings: { ...s.settings, locale } }))}
          />
        </FieldSet>
        <FieldSet label={t("settings.baseCurrency")} hint={t("settings.baseCurrency.hint")}>
          <SegmentedControl<Currency>
            label={t("settings.baseCurrency")}
            options={CURRENCY_OPTIONS}
            value={settings.baseCurrency}
            onChange={(baseCurrency) => update((s) => ({ ...s, settings: { ...s.settings, baseCurrency } }))}
          />
        </FieldSet>
        <FieldSet label={t("theme.label")}>
          <SegmentedControl<ThemePref>
            label={t("theme.label")}
            options={[
              { value: "system", label: t("theme.system.short") },
              { value: "light", label: t("theme.light.short") },
              { value: "dark", label: t("theme.dark.short") },
            ]}
            value={settings.theme}
            onChange={(theme) => update((s) => ({ ...s, settings: { ...s.settings, theme } }))}
          />
        </FieldSet>
        <SwitchRow
          title={t("settings.shortcuts")}
          hint={t("settings.shortcuts.hint")}
          checked={shortcuts}
          onChange={setShortcuts}
        />
      </div>
    </Card>
  );
};

export default GeneralCard;
