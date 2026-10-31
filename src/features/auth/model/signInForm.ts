// An address with something before and after the at sign and a domain ending
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

// Whether an email address looks deliverable
export const emailValid = (email: string): boolean => EMAIL.test(email.trim());

// A base the browser can never be sent to, to read a path against
const OWN_ORIGIN = "https://finance.invalid";

// Whether a text holds a control character or a backslash, which browsers bend
const hasTrickyCharacters = (text: string): boolean =>
  Array.from({ length: text.length }, (_, index) => text.charCodeAt(index)).some(
    (code) => code < 0x20 || code === 0x7f || code === 0x5c,
  );

// The page to go to after signing in: a path of this app, or the overview
export const safeNext = (next: string | null): string => {
  if (!next?.startsWith("/") || hasTrickyCharacters(next)) return "/";
  try {
    const url = new URL(next, OWN_ORIGIN);
    return url.origin === OWN_ORIGIN ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
};
