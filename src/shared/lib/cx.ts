// Joins the class names that are set
export const cx = (...names: readonly (string | false | null | undefined)[]) => names.filter(Boolean).join(" ");
