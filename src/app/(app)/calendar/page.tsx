import CalendarPage from "@/features/calendar/ui/CalendarPage/CalendarPage";
import { titled } from "@/shared/i18n/server";

export const generateMetadata = titled("nav.calendar");

// The calendar page
const Page = () => <CalendarPage />;

export default Page;
