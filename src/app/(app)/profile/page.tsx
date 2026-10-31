import ProfilePage from "@/features/profile/ui/ProfilePage/ProfilePage";
import { titled } from "@/shared/i18n/server";

export const generateMetadata = titled("nav.profile");

// The profile page
const Page = () => <ProfilePage />;

export default Page;
