import { Download, WifiOff } from "lucide-react";

/**
 * Highlights the "zero data cost" benefit on the login screen.
 */
export default function OfflineWelcomeBanner() {
  return (
    <div className="rounded-lg border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-4 text-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/15 p-2">
          <WifiOff className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            Works at home with zero data cost
          </p>
          <p className="text-muted-foreground">
            After your first sign-in, notices, results, homework and fee statements are saved to
            this device. You can open the app at home with no Wi-Fi or mobile data and still see
            everything.
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground/80">
            <Download className="h-3 w-3" /> Tip: install the app to your home screen for the best offline experience.
          </p>
        </div>
      </div>
    </div>
  );
}
