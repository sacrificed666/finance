"use client";

import { useState } from "react";

import { saveDetails } from "@/features/profile/api/profile";
import {
  detailsChanged,
  profileDetails,
  type DetailField,
  type Profile,
  type ProfileDetails,
} from "@/features/profile/model/profileFields";
import { useI18n } from "@/shared/i18n/useI18n";
import { todayISO } from "@/shared/lib/date";
import Button from "@/shared/ui/Button/Button";
import DateField from "@/shared/ui/DateField/DateField";
import Field from "@/shared/ui/Field/Field";
import FormRow from "@/shared/ui/FormRow/FormRow";
import Sheet from "@/shared/ui/Sheet/Sheet";
import TextArea from "@/shared/ui/TextArea/TextArea";
import TextInput from "@/shared/ui/TextInput/TextInput";

// The longest about text
const ABOUT_MAX = 500;

interface DetailsSheetProps {
  profile: Profile;
  onSaved: (profile: Profile) => void;
  onClose: () => void;
}

// Edits the personal details: name, work, place, birthday, links and a few words
const DetailsSheet = ({ profile, onSaved, onClose }: DetailsSheetProps) => {
  const { t, tk } = useI18n();
  const stored = profileDetails(profile);
  const [fields, setFields] = useState<ProfileDetails>(stored);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = detailsChanged(fields, stored);
  const google = profile.providers.includes("google");
  // An example of a field's value, so it never reads as one already filled in
  const example = (value: string) => t("common.example", { value });
  // Changes one field
  const set = (key: DetailField, value: string) => setFields((current) => ({ ...current, [key]: value }));

  // Saves the details, hands the stored profile back and closes
  const save = async () => {
    if (!dirty || busy) return;
    setBusy(true);
    setError(null);
    const answer = await saveDetails(fields);
    setBusy(false);
    if (!answer.ok) {
      setError(tk(answer.error ?? "", t("profile.saveFailed")));
      return;
    }
    onSaved(answer.data);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      onSubmit={() => void save()}
      problem={error}
      title={t("profile.edit")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={busy || !dirty}>
            {busy ? t("common.saving") : t("profile.saveChanges")}
          </Button>
        </>
      }
    >
      <Field label={t("profile.displayName")} hint={t("profile.displayName.hint")}>
        <TextInput
          value={fields.name}
          onChange={(event) => set("name", event.target.value)}
          placeholder={example(t("profile.displayName.placeholder"))}
          maxLength={80}
        />
      </Field>
      <FormRow>
        <Field label={t("profile.occupation")} hint={t("profile.occupation.hint")}>
          <TextInput
            value={fields.occupation}
            onChange={(event) => set("occupation", event.target.value)}
            placeholder={example(t("profile.occupation.placeholder"))}
            maxLength={80}
          />
        </Field>
        <Field label={t("profile.location")} hint={t("profile.location.hint")}>
          <TextInput
            value={fields.location}
            onChange={(event) => set("location", event.target.value)}
            placeholder={example(t("profile.location.placeholder"))}
            maxLength={80}
          />
        </Field>
      </FormRow>
      <Field label={t("profile.birthday")} hint={t("profile.birthday.hint")}>
        <DateField allowEmpty max={todayISO()} value={fields.birthday} onChange={(value) => set("birthday", value)} />
      </Field>
      <FormRow>
        <Field label={t("profile.website")} hint={t("profile.website.hint")}>
          <TextInput
            value={fields.website}
            onChange={(event) => set("website", event.target.value)}
            placeholder="https://…"
            inputMode="url"
          />
        </Field>
        <Field label={t("profile.avatar")} hint={google ? t("profile.avatar.google") : t("profile.avatar.hint")}>
          <TextInput
            value={fields.image}
            onChange={(event) => set("image", event.target.value)}
            placeholder="https://…"
            inputMode="url"
          />
        </Field>
      </FormRow>
      <Field
        label={t("profile.about")}
        hint={`${t("profile.about.hint")} · ${String(fields.about.length)}/${String(ABOUT_MAX)}`}
      >
        <TextArea
          value={fields.about}
          rows={3}
          maxLength={ABOUT_MAX}
          onChange={(event) => set("about", event.target.value)}
          placeholder={example(t("profile.about.placeholder"))}
        />
      </Field>
    </Sheet>
  );
};

export default DetailsSheet;
