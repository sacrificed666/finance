import IncomePage from "@/features/income/ui/IncomePage/IncomePage";
import { titled } from "@/shared/i18n/server";

export const generateMetadata = titled("nav.income");

// The income page
const Page = () => <IncomePage />;

export default Page;
