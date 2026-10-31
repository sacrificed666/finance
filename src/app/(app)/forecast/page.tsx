import ForecastPage from "@/features/forecast/ui/ForecastPage/ForecastPage";
import { titled } from "@/shared/i18n/server";

export const generateMetadata = titled("nav.forecast");

// The forecast page
const Page = () => <ForecastPage />;

export default Page;
