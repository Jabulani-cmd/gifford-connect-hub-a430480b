import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, BookOpen, TrendingUp, Bell, Receipt, GraduationCap } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import SubscribeButton from "./SubscribeButton";

interface ParentPaywallProps {
  subscriptionId: string;
  studentName?: string;
  amount?: number;
}

const features = [
  { icon: BookOpen, label: "View academic results & reports" },
  { icon: TrendingUp, label: "Track attendance & progress" },
  { icon: Receipt, label: "Access fee statements & receipts" },
  { icon: Bell, label: "Real-time notifications & announcements" },
  { icon: GraduationCap, label: "View homework & assessments" },
  { icon: Shield, label: "Secure communication with teachers" },
];

export default function ParentPaywall({ subscriptionId, studentName, amount = 10 }: ParentPaywallProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <img src={schoolLogo} alt="School Logo" className="h-16 w-auto mx-auto" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Subscription Required
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Your free trial period has ended.{" "}
            {studentName && (
              <>
                To continue monitoring <strong>{studentName}</strong>'s progress,
              </>
            )}{" "}
            please subscribe to the parent portal.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Price card */}
          <div className="rounded-xl border-2 border-primary bg-primary/5 p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Per Term
            </p>
            <p className="mt-1 text-4xl font-bold text-primary">${amount}</p>
            <p className="mt-1 text-sm text-muted-foreground">USD per student per term</p>
          </div>

          {/* Features list */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">What you get:</p>
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                <f.icon className="h-4 w-4 text-primary flex-shrink-0" />
                <span>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Subscribe button */}
          <div className="pt-2">
            <SubscribeButton
              subscriptionId={subscriptionId}
              amount={amount}
              className="w-full"
            />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Secure payment processed via Stripe. Cancel anytime by contacting the school.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
