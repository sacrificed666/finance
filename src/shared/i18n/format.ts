// The language numbers and dates are formatted in
let activeIntl = "en-GB";

// Sets the language for numbers and dates
export const setFormatLocale = (intl: string): void => {
  activeIntl = intl;
};

// The language numbers and dates are formatted in
export const formatLocale = (): string => activeIntl;
