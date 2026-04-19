import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import MessagingPanel from "@/components/MessagingPanel";
import OfflineIndicator from "@/components/offline/OfflineIndicator";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <>
      {children}
      {user && <MessagingPanel />}
      <OfflineIndicator />
    </>
  );
}
