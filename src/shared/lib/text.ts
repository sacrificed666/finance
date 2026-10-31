// Up to two capitals from a name: two of one word, or the first of two words
export const initials = (name: string): string => {
  const words = name
    .replaceAll(/[^\p{L}\p{N}\s.]/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  const [first = "", second] = words;
  if (first === "") return "?";
  if (second === undefined) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
};
