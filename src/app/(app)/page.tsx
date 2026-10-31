import DashboardPage from "@/features/dashboard/ui/DashboardPage/DashboardPage";
import { titled } from "@/shared/i18n/server";

export const generateMetadata = titled("nav.dashboard");

// The overview page
const Page = () => <DashboardPage />;

export default Page;
