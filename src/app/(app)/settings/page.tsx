import SettingsPage from "@/features/settings/ui/SettingsPage/SettingsPage";
import { titled } from "@/shared/i18n/server";

export const generateMetadata = titled("nav.settings");

// The settings page
const Page = () => <SettingsPage />;

export default Page;
