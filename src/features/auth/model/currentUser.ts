import "server-only";
import { auth } from "@/features/auth/model/auth";

// The signed-in account's id, or null for a visitor
export const currentUserId = async (): Promise<string | null> => (await auth())?.user?.id ?? null;

// The signed-in account and the sign-in its session came from, or null
export const currentSession = async (): Promise<{ id: string; signInId: string | null } | null> => {
  const session = await auth();
  const id = session?.user?.id;
  return id ? { id, signInId: session.signInId ?? null } : null;
};
