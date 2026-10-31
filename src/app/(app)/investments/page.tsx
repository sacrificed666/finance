import InvestmentsPage from "@/features/investments/ui/InvestmentsPage/InvestmentsPage";
import { titled } from "@/shared/i18n/server";

export const generateMetadata = titled("nav.investments");

// The investments page
const Page = () => <InvestmentsPage />;

export default Page;
