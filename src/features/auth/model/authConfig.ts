// The one email that may register and see server problems, when set
export const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();

// Whether Google sign-in is set up
export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

// Whether an email is the owner's
export const isOwnerEmail = (email: string | null | undefined): boolean =>
  OWNER_EMAIL !== "" && email?.trim().toLowerCase() === OWNER_EMAIL;

// Whether an email may sign up: the owner's only, or as REGISTRATION allows
export const signUpAllowed = (email: string): boolean => {
  if (OWNER_EMAIL !== "") return isOwnerEmail(email);
  const registration = (process.env.REGISTRATION ?? "").trim().toLowerCase();
  if (registration === "open" || registration === "closed") return registration === "open";
  return process.env.APP_ENV !== "production" && process.env.APP_ENV !== "staging";
};
