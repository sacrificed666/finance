import { pickableAccounts } from "@/features/accounts/model/accounts";
import type { SavingsAccount } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import type { PickerGroup, PickerItem } from "@/shared/ui/OptionPicker/OptionPicker";

// The accounts for a picker with kind and currency; archived ones only when chosen
export const useAccountGroups = (
  all: SavingsAccount[],
  lead: PickerItem[] = [],
  chosen: ReadonlyArray<string | undefined> = [],
): PickerGroup[] => {
  const { t } = useI18n();
  const groups: PickerGroup[] = lead.length > 0 ? [{ items: lead }] : [];
  const accounts = pickableAccounts(all, chosen);
  if (accounts.length > 0) {
    groups.push({
      items: accounts.map((account) => ({
        value: account.id,
        label: account.name,
        icon: account.icon,
        hint: `${t(`accountKind.${account.kind}`)} · ${account.currency}`,
      })),
    });
  }
  return groups;
};
