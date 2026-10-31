import "server-only";
import { googleEnabled } from "@/features/auth/model/authConfig";
import { twoFactorRecord } from "@/features/auth/model/twoFactor";
import type { Profile, ProfilePatch } from "@/features/profile/model/profileFields";
import { ensureSchema, getPool } from "@/shared/api/db";
import { isRecord, readText } from "@/shared/lib/guards";
import { openRecord, sealedIn, sealRecord } from "@/shared/lib/secrets";

interface ProfileSecret {
  name: string | null;
  image: string | null;
  about: string | null;
  occupation: string | null;
  location: string | null;
  website: string | null;
  birthday: string | null;
}

// The personal fields, all kept sealed
const PERSONAL = ["name", "image", "about", "occupation", "location", "website", "birthday"] as const;

// The sealed personal fields, or null when the account has none sealed yet
const profileSecret = (value: unknown): ProfileSecret | null => {
  if (!isRecord(value)) return null;
  return {
    name: readText(value, "name"),
    image: readText(value, "image"),
    about: readText(value, "about"),
    occupation: readText(value, "occupation"),
    location: readText(value, "location"),
    website: readText(value, "website"),
    birthday: readText(value, "birthday"),
  };
};

// An account's profile with its sign-in methods, or null for no such account
export const loadProfile = async (userId: string): Promise<Profile | null> => {
  await ensureSchema();
  const res = await getPool().query(
    `SELECT u.id, u.email, u.name, u.image, u.profile_secret, u.two_factor,
            to_char(u."emailVerified", 'YYYY-MM-DD"T"HH24:MI:SSZ') AS email_verified,
            to_char(u.created_at, 'YYYY-MM-DD') AS created_at,
            u.password_hash IS NOT NULL AS has_password,
            COALESCE(
              (SELECT array_agg(DISTINCT a.provider) FROM accounts a WHERE a."userId" = u.id),
              '{}'
            ) AS providers,
            (SELECT count(*) FROM passkeys p WHERE p.user_id = u.id)::int AS passkeys
       FROM users u WHERE u.id = $1`,
    [userId],
  );
  const r = res.rows[0];
  if (!r) return null;
  const sealed = profileSecret(openRecord(r.profile_secret, sealedIn.profile(userId)));
  const twoFactor = twoFactorRecord(openRecord(r.two_factor, sealedIn.twoFactor(userId)));
  return {
    id: r.id,
    email: r.email,
    emailVerified: r.email_verified,
    // Google sign-in fills the plain name and image until the profile is first saved
    name: sealed ? sealed.name : r.name,
    image: sealed ? sealed.image : r.image,
    about: sealed?.about ?? null,
    occupation: sealed?.occupation ?? null,
    location: sealed?.location ?? null,
    website: sealed?.website ?? null,
    birthday: sealed?.birthday ?? null,
    createdAt: r.created_at,
    hasPassword: r.has_password,
    providers: r.providers ?? [],
    twoFactor: Boolean(twoFactor.secret),
    recoveryLeft: twoFactor.secret ? (twoFactor.recovery?.length ?? 0) : 0,
    passkeys: Number(r.passkeys ?? 0),
    googleAvailable: googleEnabled,
  };
};

// A trimmed text, or null for an empty one
const clean = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

// Seals the personal fields with the changes, clearing Google's plain copy
export const saveProfile = async (userId: string, patch: ProfilePatch): Promise<void> => {
  if (!PERSONAL.some((field) => field in patch)) return;

  const current = await loadProfile(userId);
  if (!current) return;

  const personal: ProfileSecret = {
    name: clean("name" in patch ? patch.name : current.name),
    image: clean("image" in patch ? patch.image : current.image),
    about: clean("about" in patch ? patch.about : current.about),
    occupation: clean("occupation" in patch ? patch.occupation : current.occupation),
    location: clean("location" in patch ? patch.location : current.location),
    website: clean("website" in patch ? patch.website : current.website),
    birthday: clean("birthday" in patch ? patch.birthday : current.birthday),
  };

  await getPool().query(`UPDATE users SET profile_secret = $2, name = NULL, image = NULL WHERE id = $1`, [
    userId,
    sealRecord(personal, sealedIn.profile(userId)),
  ]);
};
