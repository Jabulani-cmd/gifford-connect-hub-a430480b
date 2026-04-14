import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { Check, Star, CreditCard, Clock, Shield, Loader2, Trash2 } from "lucide-react";
import PaynowCheckout from "./PaynowCheckout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";

interface Plan {
  id: string;
  name: string;
  billing_cycle: string;
  price_usd: number;
  description: string;
  features: string[];
  is_popular: boolean;
}

interface Subscription {
  id: string;
  student_id: string;
  status: string;
  plan_type: string;
  plan_id: string | null;
  trial_end_date: string | null;
  amount_usd: number;
  students?: { full_name: string; admission_number: string } | null;
}

export default function PlansBilling() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { rate, usdToZig } = useExchangeRate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [plansRes, subsRes, paymentsRes] = await Promise.all([
      supabase.from("subscription_plans").select("*").eq("is_active", true).order("price_usd"),
      supabase.from("portal_subscriptions").select("*, students(full_name, admission_number)").eq("parent_id", user!.id),
      supabase.from("portal_payments").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    if (plansRes.data) setPlans(plansRes.data as any);
    if (subsRes.data) setSubscriptions(subsRes.data as any);
    if (paymentsRes.data) setPayments(paymentsRes.data);
    setLoading(false);
  };

  const handleDeletePending = async (paymentId: string) => {
    const { error } = await supabase.from("portal_payments").delete().eq("id", paymentId).eq("status", "pending");
    // Also clean up any related paynow_transactions
    await supabase.from("paynow_transactions").delete().eq("status", "pending").eq("parent_id", user!.id);
    if (error) {
      toast({ title: "Error", description: "Could not delete payment. Please try again.", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Pending payment has been removed." });
      fetchData();
    }
  };

  const handleSelectPlan = (plan: Plan, sub: Subscription) => {
    setSelectedPlan(plan);
    setSelectedSub(sub);
    setShowCheckout(true);
  };

  const billingLabel = (cycle: string) => {
    switch (cycle) {
      case "monthly": return "/month";
      case "termly": return "/term";
      case "yearly": return "/year";
      default: return "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (showCheckout && selectedPlan && selectedSub) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setShowCheckout(false)}>
          ← Back to Plans
        </Button>
        <PaynowCheckout
          paymentType="subscription"
          subscriptionId={selectedSub.id}
          studentName={(selectedSub.students as any)?.full_name}
          defaultAmount={selectedPlan.price_usd}
          onSuccess={() => {
            setShowCheckout(false);
            fetchData();
            toast({ title: "Payment successful!", description: "Your subscription has been activated." });
          }}
          onCancel={() => setShowCheckout(false)}
        />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Plans & Billing</h2>
        <p className="text-sm text-muted-foreground">Choose a subscription plan for portal access</p>
      </div>

      {/* Current Subscriptions */}
      {subscriptions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Subscriptions</h3>
          {subscriptions.map((sub) => (
            <Card key={sub.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{(sub.students as any)?.full_name || "Student"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={sub.status === "active" ? "default" : sub.status === "free_trial" ? "secondary" : "destructive"}>
                      {sub.status === "free_trial" ? "Free Trial" : sub.status === "active" ? "Active" : sub.status === "unpaid" ? "Unpaid" : sub.status}
                    </Badge>
                    {sub.plan_type && (
                      <span className="text-xs text-muted-foreground capitalize">{sub.plan_type} plan</span>
                    )}
                  </div>
                  {sub.status === "free_trial" && sub.trial_end_date && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Trial ends: {new Date(sub.trial_end_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">${sub.amount_usd}</p>
                  <p className="text-xs text-muted-foreground">per {sub.plan_type || "term"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Plans Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Available Plans</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan, idx) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-shadow hover:shadow-lg ${
                plan.is_popular ? "border-2 border-primary shadow-md" : ""
              }`}
            >
              {plan.is_popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <Star className="h-3 w-3" /> POPULAR
                </div>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <CardDescription className="text-xs">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-3xl font-bold text-primary">${plan.price_usd}</span>
                  <span className="text-sm text-muted-foreground">{billingLabel(plan.billing_cycle)}</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ ZiG {usdToZig(plan.price_usd).toFixed(0)}{billingLabel(plan.billing_cycle)}
                  </p>
                </div>

                <ul className="space-y-2">
                  {(plan.features || []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Show pay button per subscription */}
                {subscriptions.length > 0 ? (
                  <div className="space-y-2">
                    {subscriptions.map((sub) => (
                      <Button
                        key={sub.id}
                        size="sm"
                        className="w-full"
                        variant={plan.is_popular ? "default" : "outline"}
                        onClick={() => handleSelectPlan(plan, sub)}
                        disabled={sub.status === "active"}
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                        {sub.status === "active"
                          ? "Active"
                          : `Pay for ${(sub.students as any)?.full_name?.split(" ")[0] || "Student"}`}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-center text-muted-foreground">Link a student first</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Payment History</h3>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">${p.amount_usd} {p.currency?.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={p.status === "completed" ? "default" : p.status === "pending" ? "secondary" : "destructive"}>
                      {p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Shield className="h-4 w-4" />
        <span>All payments are processed securely via Paynow Zimbabwe</span>
      </div>
    </motion.div>
  );
}
