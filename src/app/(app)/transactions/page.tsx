import TransactionsPage from "@/features/transactions/ui/TransactionsPage/TransactionsPage";
import { titled } from "@/shared/i18n/server";

export const generateMetadata = titled("nav.expenses");

interface PageProps {
  searchParams: Promise<{ category?: string | string[]; review?: string | string[] }>;
}

// The expenses page, its ledger narrowed to a linked category or review queue
const Page = async ({ searchParams }: PageProps) => {
  const { category, review } = await searchParams;
  return <TransactionsPage category={typeof category === "string" ? category : undefined} review={review === "1"} />;
};

export default Page;
