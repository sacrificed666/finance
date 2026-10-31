import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/features/auth/model/auth";

// The signed-out pages; a signed-in visitor goes straight to the overview
const AuthLayout = async ({ children }: { children: ReactNode }) => {
  if ((await auth())?.user?.id) redirect("/");
  return children;
};

export default AuthLayout;
