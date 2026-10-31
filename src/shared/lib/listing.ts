export type SortDirection = "asc" | "desc";

// From this many items a list gets search, sorting and filters
export const LIST_TOOLS_AT = 4;

// A sorted copy: numbers by value, text by the page language's collation
export const sortItems = <T>(items: readonly T[], key: (item: T) => number | string, direction: SortDirection): T[] => {
  const sign = direction === "asc" ? 1 : -1;
  return items.toSorted((a, b) => {
    const first = key(a);
    const second = key(b);
    if (typeof first === "number" && typeof second === "number") return (first - second) * sign;
    return String(first).localeCompare(String(second)) * sign;
  });
};

// Whether any of the fields contains the search text, ignoring case
export const matchesQuery = (query: string, ...fields: (string | undefined | null)[]): boolean => {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "") return true;
  return fields.some((field) => (field ?? "").toLocaleLowerCase().includes(needle));
};

// A check that a stored value is one of the allowed strings
export const oneOf =
  <T extends string>(values: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === "string" && (values as readonly string[]).includes(value);
