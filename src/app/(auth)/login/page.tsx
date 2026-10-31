import { Suspense } from "react";

import { googleEnabled } from "@/features/auth/model/authConfig";
import SignInPage from "@/features/auth/ui/SignInPage/SignInPage";
import { titled } from "@/shared/i18n/server";

export const generateMetadata = titled("auth.login.submit");

// The sign-in page; the search for the next page needs a suspense boundary
const Page = () => (
  <Suspense>
    <SignInPage mode="login" googleEnabled={googleEnabled} />
  </Suspense>
);

export default Page;
