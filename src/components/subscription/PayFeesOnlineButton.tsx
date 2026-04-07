// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreditCard } from "lucide-react";
import PaynowCheckout from "@/components/subscription/PaynowCheckout";

interface PayFeesOnlineButtonProps {
  invoiceId: string;
  studentId: string;
  studentName: string;
  amountDue: number;
  currency?: "usd" | "zig";
}

export default function PayFeesOnlineButton({
  invoiceId,
  studentId,
  studentName,
  amountDue,
  currency = "usd",
}: PayFeesOnlineButtonProps) {
  const [open, setOpen] = useState(false);

  if (amountDue <= 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <CreditCard className="h-4 w-4" />
          Pay Online
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <PaynowCheckout
          paymentType="fees"
          invoiceId={invoiceId}
          studentId={studentId}
          studentName={studentName}
          defaultAmount={amountDue}
          currency={currency}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
