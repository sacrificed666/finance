import AccountsPage from "@/features/accounts/ui/AccountsPage/AccountsPage";
import { titled } from "@/shared/i18n/server";

export const generateMetadata = titled("nav.accounts");

// The accounts page
const Page = () => <AccountsPage />;

export default Page;
