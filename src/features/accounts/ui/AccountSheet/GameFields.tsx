"use client";

import type { AccountForm } from "@/features/accounts/model/accountForm";
import { CUSTOM_GAME_ID, GAMES, gameLogoSources } from "@/features/accounts/model/games";
import { useI18n } from "@/shared/i18n/useI18n";
import Field from "@/shared/ui/Field/Field";
import Icon from "@/shared/ui/Icon/Icon";
import RemoteLogo from "@/shared/ui/RemoteLogo/RemoteLogo";
import Select from "@/shared/ui/Select/Select";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./AccountSheet.module.scss";

interface GameFieldsProps {
  form: AccountForm;
  onChange: (fields: Partial<AccountForm>) => void;
}

// The game of a skins inventory, or a custom one with its name and logo
const GameFields = ({ form, onChange }: GameFieldsProps) => {
  const { t } = useI18n();
  return (
    <>
      <Field label={t("balance.acc.game")} hint={t("balance.acc.game.hint")}>
        <div className={styles.picker}>
          <span className={styles.preview}>
            <RemoteLogo
              sources={gameLogoSources(form.game, form.gameLogo.trim())}
              fallback={<Icon name="gamepad" size={20} className={styles.placeholder} />}
              size={30}
            />
          </span>
          <div className={styles.select}>
            <Select value={form.game} onChange={(event) => onChange({ game: event.target.value })}>
              {GAMES.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
              <option value={CUSTOM_GAME_ID}>{t("balance.acc.game.custom")}</option>
            </Select>
          </div>
        </div>
      </Field>
      {form.game === CUSTOM_GAME_ID && (
        <>
          <Field label={t("balance.acc.game.name")}>
            <TextInput
              value={form.gameName}
              maxLength={60}
              onChange={(event) => onChange({ gameName: event.target.value })}
              placeholder={t("common.example", { value: "Escape from Tarkov" })}
            />
          </Field>
          <Field label={t("balance.acc.game.logo")} hint={t("balance.acc.game.logo.hint")}>
            <TextInput
              value={form.gameLogo}
              onChange={(event) => onChange({ gameLogo: event.target.value })}
              placeholder="https://…"
            />
          </Field>
        </>
      )}
    </>
  );
};

export default GameFields;
