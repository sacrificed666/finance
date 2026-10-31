import type { SyncStatus } from "@/app/store";
import type { I18n } from "@/shared/i18n/translate";

// The tooltip of the save status: what is being saved, or why it failed
export const syncTitle = (sync: SyncStatus, t: I18n["t"]): string =>
  sync === "error" ? t("sync.errorTitle") : t("sync.savingTitle");
