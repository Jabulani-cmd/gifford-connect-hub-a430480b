import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, BookOpen, TrendingUp, Bell, Receipt, GraduationCap } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import PaynowCheckout from "./PaynowCheckout";

interface ParentPaywallProps {
  subscriptionId: string;
  studentName?: string;
  amount?: number;
}

export default function ParentPaywall({ subscriptionId, studentName, amount = 10 }: ParentPaywallProps) {
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
