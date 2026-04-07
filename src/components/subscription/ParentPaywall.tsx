import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, BookOpen, TrendingUp, Bell, Receipt, GraduationCap, Lock } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import PaynowCheckout from "./PaynowCheckout";

interface ParentPaywallProps {
  subscriptionId?: string | null;
  studentName?: string;
  amount?: number;
  reason?: string;
}

export default function ParentPaywall({ subscriptionId, studentName, amount = 10, reason }: ParentPaywallProps) {
  // If we have a subscription ID, show the checkout
  if (subscriptionId) {
    return (
      <PaynowCheckout
        paymentType="subscription"
        subscriptionId={subscriptionId}
        studentName={studentName}
        defaultAmount={amount}
        onSuccess={() => window.location.reload()}
      />
    );
  }

  // No subscription exists yet — show a message telling parent to link a child first
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-xl text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-4">
            <img src={schoolLogo} alt="School Logo" className="h-16 w-auto mx-auto" />
          </div>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Lock className="h-7 w-7 text-amber-600" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            Subscription Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {reason === "no_subscription"
              ? "You need an active portal subscription to access your child's information. Please link a student first, then complete your subscription payment."
              : "Your portal subscription has expired. Please renew your subscription to continue accessing the portal."}
          </p>
          <div className="space-y-2 text-left">
            <p className="text-sm font-semibold text-foreground">Portal access includes:</p>
            {[
              { icon: BookOpen, label: "View academic results & reports" },
              { icon: TrendingUp, label: "Track attendance & progress" },
              { icon: Receipt, label: "Access fee statements & receipts" },
              { icon: Bell, label: "Real-time notifications & announcements" },
              { icon: GraduationCap, label: "View homework & assessments" },
              { icon: Shield, label: "Secure communication with teachers" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                <f.icon className="h-4 w-4 text-primary flex-shrink-0" />
                <span>{f.label}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border-2 border-primary bg-primary/5 p-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Per Term</p>
            <p className="text-3xl font-bold text-primary">${amount}</p>
            <p className="text-xs text-muted-foreground">per student per term</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
