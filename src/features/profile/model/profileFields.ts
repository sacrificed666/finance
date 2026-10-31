import type { MessageKey } from "@/shared/i18n/messages/en";

export interface Profile {
  id: string;
  email: string | null;
  emailVerified: string | null;
  name: string | null;
  image: string | null;
  about: string | null;
  occupation: string | null;
  location: string | null;
  website: string | null;
  birthday: string | null;
  createdAt: string;
  hasPassword: boolean;
  providers: string[];
  twoFactor: boolean;
  recoveryLeft: number;
  passkeys: number;
  // Whether this server can link a Google account at all
  googleAvailable?: boolean;
}

// The fields of the details form, in the order they are kept
export const DETAIL_FIELDS = ["name", "image", "about", "occupation", "location", "website", "birthday"] as const;

export type DetailField = (typeof DETAIL_FIELDS)[number];

export type ProfilePatch = Partial<Record<DetailField, string | null>>;

export type ProfileDetails = Record<DetailField, string>;

// The details of a profile as the form shows them
export const profileDetails = (profile: Profile): ProfileDetails => ({
  name: profile.name ?? "",
  image: profile.image ?? "",
  about: profile.about ?? "",
  occupation: profile.occupation ?? "",
  location: profile.location ?? "",
  website: profile.website ?? "",
  birthday: profile.birthday ?? "",
});

// Whether the typed details differ from the stored ones
export const detailsChanged = (typed: ProfileDetails, stored: ProfileDetails): boolean =>
  DETAIL_FIELDS.some((key) => typed[key].trim() !== stored[key]);

// The whole years since a birthday
export const ageFrom = (birthday: string, now = new Date()): number => {
  const born = new Date(`${birthday}T00:00:00Z`);
  const beforeBirthday =
    now.getUTCMonth() < born.getUTCMonth() ||
    (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() < born.getUTCDate());
  return Math.max(0, now.getUTCFullYear() - born.getUTCFullYear() - (beforeBirthday ? 1 : 0));
};

// Why a link cannot be kept: not a URL, not https or too long, or null
const linkProblem = (url: string, max: number, notHttps: MessageKey, tooLong: MessageKey): MessageKey | null => {
  if (url === "") return null;
  if (!URL.canParse(url)) return "profile.problem.url";
  if (new URL(url).protocol !== "https:") return notHttps;
  return url.length > max ? tooLong : null;
};

// Why an avatar address cannot be kept, or null
export const avatarProblem = (url: string): MessageKey | null =>
  linkProblem(url, 500, "profile.problem.avatarHttps", "profile.problem.avatarLong");

// Why a website address cannot be kept, or null
export const websiteProblem = (url: string): MessageKey | null =>
  linkProblem(url, 200, "profile.problem.websiteHttps", "profile.problem.websiteLong");

// The longest age a birthday may give
const OLDEST_MS = 130 * 365.25 * 24 * 3600 * 1000;

// Why a birthday cannot be kept: a bad format, no such date or out of range
export const birthdayProblem = (value: string, now = Date.now()): MessageKey | null => {
  if (value === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return "profile.problem.birthdayFormat";
  const date = new Date(`${value}T00:00:00Z`).getTime();
  if (Number.isNaN(date)) return "profile.problem.birthdayInvalid";
  if (date > now) return "profile.problem.birthdayFuture";
  return now - date > OLDEST_MS ? "profile.problem.birthdayOld" : null;
};

// The fields a request asks to change: text trimmed to 500, null to clear
export const profilePatch = (body: Readonly<Record<string, unknown>>): ProfilePatch => {
  const patch: ProfilePatch = {};
  for (const key of DETAIL_FIELDS) {
    const value = body[key];
    if (value === null) patch[key] = null;
    else if (typeof value === "string") patch[key] = value.slice(0, 500).trim();
  }
  return patch;
};

// What is wrong with a profile update, or null when it will do
export const patchProblem = (patch: ProfilePatch, now = Date.now()): MessageKey | null => {
  if (typeof patch.name === "string" && patch.name.length > 80) return "profile.problem.nameLong";
  const { image, website, birthday, occupation, location } = patch;
  const problem =
    (typeof image === "string" ? avatarProblem(image) : null) ??
    (typeof website === "string" ? websiteProblem(website) : null) ??
    (typeof birthday === "string" ? birthdayProblem(birthday, now) : null);
  if (problem) return problem;
  const long = [occupation, location].some((value) => typeof value === "string" && value.length > 80);
  return long ? "profile.problem.valueLong" : null;
};
