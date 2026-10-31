import { createContext } from "react";

import { type I18n, makeI18n } from "./translate";

// The translator of the page language; English keys until messages arrive
export const I18nContext = createContext<I18n>(makeI18n("en", {}));
