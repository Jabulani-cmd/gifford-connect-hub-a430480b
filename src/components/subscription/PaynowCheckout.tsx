// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, BookOpen, TrendingUp, Bell, Receipt, GraduationCap, Smartphone, CreditCard, Loader2, CheckCircle, XCircle } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useExchangeRate } from "@/hooks/useExchangeRate";

interface PaynowCheckoutProps {
  paymentType: "subscription" | "fees";
  subscriptionId?: string;
  invoiceId?: string;
  studentId?: string;
  studentName?: string;
  defaultAmount?: number;
  currency?: "usd" | "zig";
  onSuccess?: () => void;
  onCancel?: () => void;
}

const features = [
  { icon: BookOpen, label: "View academic results & reports" },
  { icon: TrendingUp, label: "Track attendance & progress" },
  { icon: Receipt, label: "Access fee statements & receipts" },
  { icon: Bell, label: "Real-time notifications & announcements" },
  { icon: GraduationCap, label: "View homework & assessments" },
  { icon: Shield, label: "Secure communication with teachers" },
];

type PaymentMethod = "ecocash" | "onemoney" | "web";
type CheckoutStep = "method" | "processing" | "polling" | "success" | "failed";

function getCurrentTerm(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 1 && month <= 4) return "Term 1";
  if (month >= 5 && month <= 8) return "Term 2";
  return "Term 3";
}

function getCurrentYear(): string {
  return new Date().getFullYear().toString();
}

const TERM_OPTIONS = [
  { value: "Term 1", label: "Term 1 (Jan – Apr)" },
  { value: "Term 2", label: "Term 2 (May – Aug)" },
  { value: "Term 3", label: "Term 3 (Sep – Dec)" },
];

export default function PaynowCheckout({
  paymentType,
  subscriptionId,
  invoiceId,
  studentId,
  studentName,
  defaultAmount = 10,
  currency: defaultCurrency = "usd",
  onSuccess,
  onCancel,
}: PaynowCheckoutProps) {
  const [method, setMethod] = useState<PaymentMethod>("ecocash");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState<"usd" | "zig">(defaultCurrency);
  const [amount, setAmount] = useState(defaultAmount);
  const [step, setStep] = useState<CheckoutStep>("method");
  const [pollRef, setPollRef] = useState<string | null>(null);
  const [pollUrl, setPollUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState(getCurrentTerm());
  const [selectedYear] = useState(getCurrentYear());
  const { toast } = useToast();
  const { rate, usdToZig } = useExchangeRate();
  const pollIntervalRef = useRef<number | null>(null);

  // Calculate ZiG amount when currency changes
  useEffect(() => {
    if (paymentType === "subscription") {
      if (currency === "zig") {
        setAmount(Math.round(usdToZig(defaultAmount) * 100) / 100);
      } else {
        setAmount(defaultAmount);
      }
    }
  }, [currency, defaultAmount, rate]);

  // Get user email on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setEmail(data.user.email);
    });
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    if ((method === "ecocash" || method === "onemoney") && !phone) {
      toast({ title: "Phone number required", description: "Please enter your mobile money number.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setStep("processing");
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke("paynow-initiate", {
        body: {
          payment_type: paymentType,
          subscription_id: subscriptionId,
          invoice_id: invoiceId,
          student_id: studentId,
          amount,
          currency,
          method,
          phone: phone.replace(/\s/g, ""),
          email,
          term: selectedTerm,
          year: selectedYear,
        },
      });

      if (error) {
        const fallbackMessage = data?.error || error.message || "Payment request failed";
        throw new Error(fallbackMessage);
      }
      if (data?.error) throw new Error(data.error);

      // Demo mode - payment auto-completed
      if (data.demo) {
        toast({
          title: "Payment Successful (Demo)",
          description: data.message || "Demo payment completed successfully.",
        });
        setStep("success");
        onSuccess?.();
        return;
      }

      if (method === "ecocash" || method === "onemoney") {
        // Mobile money - show polling UI
        setPollRef(data.reference);
        setPollUrl(data.poll_url);
        setStep("polling");
        startPolling(data.reference, data.poll_url);
        toast({
          title: "Check your phone",
          description: data.message || "A payment prompt has been sent to your phone.",
        });
      } else {
        // Web payment - redirect to Paynow
        if (data.redirect_url) {
          window.location.href = data.redirect_url;
        } else {
          throw new Error("No redirect URL received");
        }
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      const msg = err.message || "Something went wrong. Please try again.";
      setErrorMessage(msg);
      setStep("failed");
      toast({
        title: "Payment Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (ref: string, url: string | null) => {
    let attempts = 0;
    const maxAttempts = 60;

    pollIntervalRef.current = window.setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setStep("failed");
        setErrorMessage("Payment timed out. If you completed the payment, please wait a few minutes and refresh.");
        return;
      }

      try {
        const { data } = await supabase.functions.invoke("paynow-poll", {
          body: { reference: ref, poll_url: url },
        });

        if (data?.status === "completed") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setStep("success");
          onSuccess?.();
        } else if (data?.status === "failed") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setStep("failed");
          setErrorMessage("Payment was declined or cancelled.");
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 5000);
  };

  if (step === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md shadow-xl text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Payment Successful!</h2>
            <p className="text-muted-foreground">
              {paymentType === "subscription"
                ? `Your portal subscription for ${selectedTerm} ${selectedYear} is now active. You have full access.`
                : "Your fee payment has been received and recorded."}
            </p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Continue to Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "failed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md shadow-xl text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Payment Failed</h2>
            <p className="text-muted-foreground">
              {errorMessage || "The payment was not completed. Please try again."}
            </p>
            <Button onClick={() => { setStep("method"); setErrorMessage(null); }} variant="outline" className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "polling") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md shadow-xl text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Waiting for Payment</h2>
            <p className="text-muted-foreground">
              A payment prompt has been sent to <strong>{phone}</strong>.
              <br />Please enter your PIN on your phone to authorize the payment.
            </p>
            <p className="text-xs text-muted-foreground">This page will update automatically once payment is confirmed.</p>
            <Button variant="ghost" size="sm" onClick={() => {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setStep("method");
            }}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <img src={schoolLogo} alt="School Logo" className="h-16 w-auto mx-auto" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {paymentType === "subscription" ? "Subscribe to Portal" : "Pay School Fees"}
          </CardTitle>
          {studentName && (
            <p className="text-muted-foreground mt-1">
              {paymentType === "subscription"
                ? `Portal access for ${studentName}`
                : `Fees for ${studentName}`}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Term selection for subscriptions */}
          {paymentType === "subscription" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {TERM_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label} {selectedYear}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Currency selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Currency</Label>
            <RadioGroup value={currency} onValueChange={(v) => setCurrency(v as "usd" | "zig")} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="usd" id="usd" />
                <Label htmlFor="usd" className="cursor-pointer">USD (US Dollar)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="zig" id="zig" />
                <Label htmlFor="zig" className="cursor-pointer">ZiG (Zimbabwe Gold)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount */}
          {paymentType === "fees" && (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({currency.toUpperCase()})</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}

          {paymentType === "subscription" && (
            <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{selectedTerm} {selectedYear}</p>
              <p className="text-3xl font-bold text-primary">
                {currency === "usd" ? "$" : "ZiG "}{amount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">per student per term</p>
              {currency === "zig" && (
                <p className="text-xs text-muted-foreground mt-1">
                  (Rate: 1 USD = {rate} ZiG)
                </p>
              )}
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Payment Method</Label>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="space-y-2">
              <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="ecocash" id="ecocash" />
                <Smartphone className="h-5 w-5 text-green-600" />
                <Label htmlFor="ecocash" className="cursor-pointer flex-1">
                  <span className="font-medium">EcoCash</span>
                  <span className="block text-xs text-muted-foreground">Pay via Econet mobile money</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="onemoney" id="onemoney" />
                <Smartphone className="h-5 w-5 text-blue-600" />
                <Label htmlFor="onemoney" className="cursor-pointer flex-1">
                  <span className="font-medium">OneMoney</span>
                  <span className="block text-xs text-muted-foreground">Pay via NetOne mobile money</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="web" id="web" />
                <CreditCard className="h-5 w-5 text-primary" />
                <Label htmlFor="web" className="cursor-pointer flex-1">
                  <span className="font-medium">Visa / Mastercard / Zimswitch</span>
                  <span className="block text-xs text-muted-foreground">Pay by card or bank transfer via Paynow</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Phone number for mobile money */}
          {(method === "ecocash" || method === "onemoney") && (
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={method === "ecocash" ? "077XXXXXXX" : "071XXXXXXX"}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the {method === "ecocash" ? "Econet" : "NetOne"} number linked to your {method === "ecocash" ? "EcoCash" : "OneMoney"} wallet
              </p>
            </div>
          )}

          {/* Features for subscription */}
          {paymentType === "subscription" && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">What you get:</p>
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <f.icon className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading || step === "processing"}
            size="lg"
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {method === "ecocash" || method === "onemoney" ? (
                  <Smartphone className="h-5 w-5" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                Pay {currency === "usd" ? "$" : "ZiG "}{amount.toFixed(2)} via {method === "ecocash" ? "EcoCash" : method === "onemoney" ? "OneMoney" : "Card/Bank"}
              </>
            )}
          </Button>

          {onCancel && (
            <Button variant="ghost" size="sm" className="w-full" onClick={onCancel}>
              Cancel
            </Button>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Secure payment processed via Paynow Zimbabwe
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
