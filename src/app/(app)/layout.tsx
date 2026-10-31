import type { ReactNode } from "react";

import EntryIntents from "@/features/transactions/ui/EntryIntents/EntryIntents";
import AppShell from "@/widgets/AppShell/AppShell";

interface AppLayoutProps {
  children: ReactNode;
}

// The signed-in pages in the app's frame, with the home screen's quick adds
const AppLayout = ({ children }: AppLayoutProps) => (
  <>
    <AppShell>{children}</AppShell>
    <EntryIntents />
  </>
);

export default AppLayout;
