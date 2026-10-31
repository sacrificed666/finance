// Each language's month names alone and as a date's day needs them
const cases = new Map<string, Array<[RegExp, string]>>();

// The text with its first letter in capitals
const capitalize = (text: string, intl: string): string => text.charAt(0).toLocaleUpperCase(intl) + text.slice(1);

// A month name as a whole word, not the start of a longer one
const word = (name: string): RegExp => new RegExp(`(?<!\\p{L})${name}(?!\\p{L})`, "gu");

// The month names that change after a day, with what they change to
const genitives = (intl: string): Array<[RegExp, string]> => {
  let table = cases.get(intl);
  if (!table) {
    const alone = new Intl.DateTimeFormat(intl, { month: "long", timeZone: "UTC" });
    const dated = new Intl.DateTimeFormat(intl, { day: "numeric", month: "long", timeZone: "UTC" });
    table = Array.from({ length: 12 }, (_, index) => {
      const day = new Date(Date.UTC(2024, index, 15, 12));
      const name = alone.format(day);
      const genitive = dated.formatToParts(day).find((part) => part.type === "month")?.value ?? name;
      return [name, genitive] as const;
    })
      .filter(([name, genitive]) => name !== genitive)
      .flatMap(([name, genitive]): Array<[RegExp, string]> => [
        [word(name), genitive],
        [word(capitalize(name, intl)), capitalize(genitive, intl)],
      ]);
    cases.set(intl, table);
  }
  return table;
};

// A text with its month names in the genitive: "жовтень 2026" as "жовтня 2026"
export const genitiveMonths = (text: string, intl: string): string =>
  genitives(intl).reduce((out, [name, genitive]) => out.replaceAll(name, genitive), text);

// A value shaped the way its placeholder asks: {month|gen} or {name|cap}
export const shapeValue = (value: string, shape: string | undefined, intl: string): string => {
  if (shape === "gen") return genitiveMonths(value, intl);
  if (shape === "cap") return capitalize(value, intl);
  return value;
};
