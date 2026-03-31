import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, DollarSign, ShieldCheck, CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import schoolLogo from "@/assets/school-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import FinanceManagement from "@/pages/admin/FinanceManagement";
import { format } from "date-fns";

const actionTypeLabels: Record<string, string> = {
  delete_fee_structure: "Delete Fee Structure",
  delete_expense: "Delete Expense",
  delete_petty_cash: "Delete Petty Cash Entry",
  delete_supplier_invoice: "Delete Supplier Invoice",
  void_invoice: "Void Invoice",
  void_payment: "Void Payment",
};

export default function FinanceDashboard() {
  const { signOut, user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isBurser = role === "bursar";

  // Approval requests state (for burser)
  const [approvalRequests, setApprovalRequests] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [reviewDialog, setReviewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  useEffect(() => {
    if (isBurser) {
      fetchApprovalRequests();
      const channel = supabase
        .channel("burser-approval-requests")
        .on("postgres_changes", { event: "*", schema: "public", table: "finance_approval_requests" }, () => {
          fetchApprovalRequests();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [isBurser]);

  async function fetchApprovalRequests() {
    const { data } = await supabase
      .from("finance_approval_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setApprovalRequests(data);
      const userIds = [...new Set(data.map((r: any) => r.requested_by))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        if (profs) {
          const map: Record<string, string> = {};
          profs.forEach((p: any) => { map[p.id] = p.full_name; });
          setProfiles(map);
        }
      }
    }
  }

  async function handleReview(action: "approved" | "rejected") {
    if (!selectedRequest) return;
    setProcessing(true);

    const { error } = await supabase
      .from("finance_approval_requests")
      .update({
        status: action,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq("id", selectedRequest.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setProcessing(false);
      return;
    }

    if (action === "approved") {
      const { target_table, target_id, action_type } = selectedRequest;
      if (action_type.startsWith("delete_")) {
        if (target_table === "fee_structures") {
          await supabase.from("invoice_items").update({ fee_structure_id: null }).eq("fee_structure_id", target_id);
        }
        await supabase.from(target_table as any).delete().eq("id", target_id);
        toast({ title: "Approved & deleted" });
      } else if (action_type === "void_invoice") {
        await supabase.from("invoices").update({ status: "voided" } as any).eq("id", target_id);
        toast({ title: "Invoice voided" });
      } else if (action_type === "void_payment") {
        await supabase.from("payments").delete().eq("id", target_id);
        toast({ title: "Payment voided & reversed" });
      }
    } else {
      toast({ title: "Request rejected" });
    }

    await supabase.from("notifications").insert({
      user_id: selectedRequest.requested_by,
      title: `Approval ${action === "approved" ? "Granted" : "Denied"}`,
      message: `Your request to "${selectedRequest.description}" has been ${action}.${reviewNotes ? ` Notes: ${reviewNotes}` : ""}`,
      type: "approval",
    });

    setReviewDialog(false);
    setSelectedRequest(null);
    setReviewNotes("");
    setProcessing(false);
    fetchApprovalRequests();
  }

  const pendingCount = approvalRequests.filter(r => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-section-warm">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-3 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={schoolLogo} alt="Logo" className="h-10 w-10 sm:h-16 sm:w-16 object-contain" />
            <div>
              <h1 className="font-heading text-sm sm:text-lg font-bold text-primary">
                {isBurser ? "Burser Portal" : "Finance Portal"}
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 text-xs sm:text-sm">
            <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {isBurser ? (
            <Tabs defaultValue="finance">
              <TabsList className="mb-4">
                <TabsTrigger value="finance" className="gap-2">
                  <DollarSign className="h-4 w-4" /> Finance
                </TabsTrigger>
                <TabsTrigger value="approvals" className="gap-2">
                  <ShieldCheck className="h-4 w-4" /> Approvals
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">{pendingCount}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="finance">
                <FinanceManagement />
              </TabsContent>

              <TabsContent value="approvals">
                <div className="space-y-4">
                  <h2 className="font-heading text-lg font-bold text-primary">Finance Approval Requests</h2>
                  <p className="text-sm text-muted-foreground">
                    Finance clerks must request your approval before voiding or deleting transactions.
                  </p>

                  {approvalRequests.length === 0 ? (
                    <Card>
                      <CardContent className="py-10 text-center">
                        <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">No approval requests yet.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {approvalRequests.map(req => (
                        <Card key={req.id} className={req.status === "pending" ? "border-amber-300" : ""}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium">{actionTypeLabels[req.action_type] || req.action_type}</p>
                                  <Badge variant={req.status === "pending" ? "secondary" : req.status === "approved" ? "default" : "destructive"} className="text-[10px]">
                                    {req.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{req.description}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                  Requested by: {profiles[req.requested_by] || "Unknown"} · {format(new Date(req.created_at), "MMM d, yyyy h:mm a")}
                                </p>
                                {req.review_notes && (
                                  <p className="text-xs mt-1 italic text-muted-foreground">Notes: {req.review_notes}</p>
                                )}
                              </div>
                              {req.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setReviewNotes("");
                                    setReviewDialog(true);
                                  }}
                                >
                                  Review
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <div className="mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                <h2 className="font-heading text-lg sm:text-2xl font-bold text-primary">Finance Management</h2>
              </div>
              <FinanceManagement />
            </>
          )}
        </motion.div>
      </main>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg space-y-1">
                <p className="text-sm font-medium">{actionTypeLabels[selectedRequest.action_type] || selectedRequest.action_type}</p>
                <p className="text-xs text-muted-foreground">{selectedRequest.description}</p>
                <p className="text-xs text-muted-foreground">
                  By: {profiles[selectedRequest.requested_by] || "Unknown"}
                </p>
              </div>
              <Textarea
                placeholder="Add review notes (optional)..."
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleReview("approved")}
                  disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button
                  onClick={() => handleReview("rejected")}
                  disabled={processing}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
