import type { AppState } from "@/features/data/model/types";
import type { FOREIGN_CURRENCIES } from "@/shared/lib/money";

// The state with a rate typed by hand, which stops the automatic source
export const setManualRate = (
  state: AppState,
  currency: (typeof FOREIGN_CURRENCIES)[number],
  value: number,
  now: string,
): AppState => ({
  ...state,
  settings: {
    ...state.settings,
    rates: { ...state.settings.rates, [currency]: value },
    ratesSource: "manual",
    ratesMeta: undefined,
    ratesUpdatedAt: now,
  },
});
