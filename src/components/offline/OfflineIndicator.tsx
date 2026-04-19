import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";

/**
 * Always-visible toast-style indicator that appears only when the device is offline.
 * Reassures parents/students that the cached portal data is still available.
 */
export default function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 sm:bottom-6">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-destructive/40 bg-background/95 px-4 py-2 text-sm shadow-lg backdrop-blur">
        <WifiOff className="h-4 w-4 text-destructive" />
        <span className="font-medium">You're offline — showing saved data</span>
      </div>
    </div>
  );
}
