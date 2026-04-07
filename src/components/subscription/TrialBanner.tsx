import { AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

interface TrialBannerProps {
  trialEndDate: string;
  status: string;
}

export default function TrialBanner({ trialEndDate, status }: TrialBannerProps) {
  if (status === "active") {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
        <CheckCircle className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm font-medium">
          Your portal subscription is active. Thank you for your payment!
        </p>
      </div>
    );
  }

  if (!trialEndDate || status !== "free_trial") return null;

  const endDate = parseISO(trialEndDate);
  const daysLeft = differenceInDays(endDate, new Date());

  if (daysLeft < 0) return null;

  const isUrgent = daysLeft <= 14;

  return (
    <div
      className={`mb-4 flex items-center gap-3 rounded-lg border px-4 py-3 ${
        isUrgent
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-blue-200 bg-blue-50 text-blue-800"
      }`}
    >
      {isUrgent ? (
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
      ) : (
        <Clock className="h-5 w-5 flex-shrink-0" />
      )}
      <p className="text-sm font-medium">
        {daysLeft === 0
          ? "Your free trial ends today! Please subscribe to continue access."
          : `Free trial ends on ${format(endDate, "dd MMMM yyyy")} (${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining).`}
      </p>
    </div>
  );
}
