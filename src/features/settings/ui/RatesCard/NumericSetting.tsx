"use client";

import { useState } from "react";

import { parseAmount } from "@/shared/lib/money";
import Field from "@/shared/ui/Field/Field";
import TextInput from "@/shared/ui/TextInput/TextInput";

interface NumericSettingProps {
  label: string;
  hint?: string;
  prefix?: string;
  value: number;
  isValid: (value: number) => boolean;
  onCommit: (value: number) => void;
}

// A number kept on leaving the field or Enter; Escape undoes the typing
const NumericSetting = ({ label, hint, prefix, value, isValid, onCommit }: NumericSettingProps) => {
  const [draft, setDraft] = useState<string | null>(null);

  // Keeps the typed number when it is valid, and shows the stored one again
  const commit = () => {
    if (draft === null) return;
    const parsed = parseAmount(draft);
    if (Number.isFinite(parsed) && isValid(parsed)) onCommit(parsed);
    setDraft(null);
  };

  return (
    <Field label={label} hint={hint}>
      <TextInput
        inputMode="decimal"
        prefix={prefix}
        value={draft ?? String(value)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setDraft(null);
        }}
      />
    </Field>
  );
};

export default NumericSetting;
