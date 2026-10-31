import { use } from "react";

import { I18nContext } from "./context";
import type { I18n } from "./translate";

// Language, translators and formatter for Client Components
export const useI18n = (): I18n => use(I18nContext);
