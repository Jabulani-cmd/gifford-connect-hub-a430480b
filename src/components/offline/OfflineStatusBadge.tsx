import { Wifi, WifiOff, CloudOff, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";

interface Props {
  online: boolean;
  fromCache: boolean;
  syncedAt: number | null;
  offlineEnabled: boolean;
  onToggleOffline: (v: boolean) => void;
  onRefresh: () => void;
  loading?: boolean;
  compact?: boolean;
}

/**
 * Small UI block placed at the top of any cached section.
 * Shows: connection state, last sync time, a "Save for offline" toggle, and a refresh button.
 */
export default function OfflineStatusBadge({
  online,
  fromCache,
  syncedAt,
  offlineEnabled,
  onToggleOffline,
  onRefresh,
  loading,
  compact,
}: Props) {
  const synced = syncedAt
    ? `Last synced ${formatDistanceToNow(syncedAt, { addSuffix: true })}`
    : "Not synced yet";

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      {online ? (
        <Badge variant="secondary" className="gap-1">
          <Wifi className="h-3 w-3" /> Online
        </Badge>
      ) : (
        <Badge variant="destructive" className="gap-1">
          <WifiOff className="h-3 w-3" /> Offline
        </Badge>
      )}

      {fromCache && (
        <Badge variant="outline" className="gap-1">
          <CloudOff className="h-3 w-3" /> Showing saved copy
        </Badge>
      )}

      <span className="text-muted-foreground">{synced}</span>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id="offline-toggle"
            checked={offlineEnabled}
            onCheckedChange={onToggleOffline}
          />
          <Label htmlFor="offline-toggle" className="cursor-pointer">
            Save for offline
          </Label>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={onRefresh}
          disabled={loading || !online}
          className="gap-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
