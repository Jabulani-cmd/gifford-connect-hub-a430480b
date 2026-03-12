// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Receipt, FileText, Printer, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { buildReceiptHtml, buildStatementHtml, SCHOOL_LOGO_URL } from "@/lib/finance/pdf";
import { openPrintWindow } from "@/lib/finance/print";

interface Props {
  studentId: string | null;
}

export default function StudentFeeTab({ studentId }: Props) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) fetchFeeData();
  }, [studentId]);

  // Realtime subscription for payments
  useEffect(() => {
    if (!studentId) return;
    const channel = supabase
      .channel(`student-payments-${studentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `student_id=eq.${studentId}` }, () => {
        fetchFeeData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices", filter: `student_id=eq.${studentId}` }, () => {
        fetchFeeData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [studentId]);

  const fetchFeeData = async () => {
    setLoading(true);
    const [{ data: inv }, { data: pay }, { data: stu }] = await Promise.all([
      supabase.from("invoices").select("*").eq("student_id", studentId!).order("created_at", { ascending: false }),
      supabase.from("payments").select("*, invoices(invoice_number)").eq("student_id", studentId!).order("payment_date", { ascending: false }),
      supabase.from("students").select("full_name, admission_number, form").eq("id", studentId!).single(),
    ]);
    setInvoices(inv || []);
    setPayments(pay || []);
    setStudent(stu);
    setLoading(false);
  };

  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.total_usd || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_usd || 0), 0);
  const balance = totalInvoiced - totalPaid; // positive = owing, negative = credit

  function handlePrintReceipt(p: any) {
    const html = buildReceiptHtml({
      logoUrl: SCHOOL_LOGO_URL,
      receiptNumber: p.receipt_number,
      paymentDate: p.payment_date,
      student: {
        fullName: student?.full_name || "—",
        admissionNumber: student?.admission_number || "—",
        form: student?.form,
      },
      invoiceNumber: p.invoices?.invoice_number,
      amounts: { usd: Number(p.amount_usd || 0), zig: Number(p.amount_zig || 0) },
      paymentMethod: p.payment_method,
      referenceNumber: p.reference_number,
    });
    openPrintWindow(html);
  }

  function handlePrintStatement() {
    if (!student) return;
    const html = buildStatementHtml({
      logoUrl: SCHOOL_LOGO_URL,
      student: { fullName: student.full_name, admissionNumber: student.admission_number, form: student.form },
      invoices: invoices.map(i => ({
        invoice_number: i.invoice_number, term: i.term, academic_year: i.academic_year,
        total_usd: i.total_usd, total_zig: i.total_zig, paid_usd: i.paid_usd, paid_zig: i.paid_zig, status: i.status,
      })),
      payments: payments.map(p => ({
        receipt_number: p.receipt_number, payment_date: p.payment_date,
        amount_usd: p.amount_usd, amount_zig: p.amount_zig, payment_method: p.payment_method,
      })),
    });
    openPrintWindow(html);
  }

  if (loading) {
    return <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Balance Summary */}
      <Card className={totalOwed > 0 ? "border-destructive/30 bg-destructive/5" : "bg-green-50 border-green-200"}>
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Outstanding Balance</p>
          <p className={`text-3xl font-bold ${totalOwed > 0 ? "text-destructive" : "text-green-600"}`}>
            ${totalOwed.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {(invoices.length > 0 || payments.length > 0) && (
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handlePrintStatement}>
            <FileText className="mr-1 h-4 w-4" /> View / Print Statement
          </Button>
        </div>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Invoices</h3>
          <div className="space-y-2">
            {invoices.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{inv.invoice_number}</p>
                    <p className="text-[11px] text-muted-foreground">{inv.term} · {inv.academic_year}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">${inv.total_usd}</p>
                    <Badge
                      className={`text-[9px] ${
                        inv.status === "paid" ? "bg-green-100 text-green-700" :
                        inv.status === "partial" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      } border-0`}
                    >
                      {inv.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Payments */}
      {payments.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Payment History</h3>
          <div className="space-y-2">
            {payments.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <Receipt className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.receipt_number}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(p.payment_date), "MMM d, yyyy")} · {p.payment_method}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-green-600">${p.amount_usd}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePrintReceipt(p)} title="Print Receipt">
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {invoices.length === 0 && payments.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <DollarSign className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No fee records found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
