import { signIn, signOut } from "next-auth/react";

import { clearOutbox } from "@/features/data/model/outbox";

// Links a Google account and comes back to the profile
export const linkGoogle = async (): Promise<void> => {
  await signIn("google", { redirectTo: "/profile" });
};

// Signs out after dropping the changes still waiting to be sent
export const leave = async (): Promise<void> => {
  await clearOutbox();
  await signOut({ redirectTo: "/login" });
};
