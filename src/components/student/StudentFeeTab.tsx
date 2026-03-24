// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { buildStatementHtml, SCHOOL_LOGO_URL } from "@/lib/finance/pdf";
import { openPrintWindow } from "@/lib/finance/print";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  studentId: string | null;
}

export default function StudentFeeTab({ studentId }: Props) {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) fetchData();
    else setLoading(false);
  }, [studentId]);

  const fetchData = async () => {
    setLoading(true);
    const [invRes, payRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("*, students(full_name, admission_number, form)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("*, invoices(invoice_number)")
        .eq("student_id", studentId)
        .order("payment_date", { ascending: false }),
    ]);
    if (invRes.error) {
      toast({ title: "Error", description: invRes.error.message, variant: "destructive" });
    } else {
      setInvoices(invRes.data || []);
    }
    if (payRes.error) {
      toast({ title: "Error", description: payRes.error.message, variant: "destructive" });
    } else {
      setPayments(payRes.data || []);
    }
    setLoading(false);
  };

  const totalInvoicedUsd = invoices.reduce((sum, i) => sum + parseFloat(i.total_usd || 0), 0);
  const totalPaidUsd = invoices.reduce((sum, i) => sum + parseFloat(i.paid_usd || 0), 0);
  const balanceUsd = totalInvoicedUsd - totalPaidUsd;

  const printStatement = () => {
    if (invoices.length === 0 && payments.length === 0) {
      toast({ title: "Nothing to print", variant: "destructive" });
      return;
    }
    const student = (invoices[0] as any)?.students || (payments[0] as any)?.students;
    const html = buildStatementHtml({
      logoUrl: SCHOOL_LOGO_URL,
      student: {
        fullName: student?.full_name || "—",
        admissionNumber: student?.admission_number || "—",
        form: student?.form || "—",
      },
      invoices: invoices.map((i: any) => ({
        invoice_number: i.invoice_number,
        term: i.term,
        academic_year: i.academic_year,
        total_usd: i.total_usd,
        total_zig: i.total_zig,
        paid_usd: i.paid_usd,
        paid_zig: i.paid_zig,
        status: i.status,
      })),
      payments: payments.map((p: any) => ({
        receipt_number: p.receipt_number,
        payment_date: p.payment_date,
        amount_usd: p.amount_usd,
        amount_zig: p.amount_zig,
        payment_method: p.payment_method,
        reference_number: p.reference_number,
      })),
    });
    openPrintWindow(html);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-bold">Fee Statement</h2>
          <p className="text-sm text-muted-foreground">All invoices and payments</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={printStatement}
          disabled={invoices.length === 0 && payments.length === 0}
        >
          <Printer className="mr-1 h-4 w-4" /> Print Statement
        </Button>
      </div>

      {/* Balance summary */}
      <Card
        className={
          balanceUsd < 0
            ? "bg-green-50 border-green-200"
            : balanceUsd > 0
              ? "bg-destructive/5 border-destructive/30"
              : ""
        }
      >
        <CardContent className="p-4 flex items-center gap-4">
          <DollarSign
            className={`h-8 w-8 ${balanceUsd < 0 ? "text-green-600" : balanceUsd > 0 ? "text-destructive" : "text-muted-foreground"}`}
          />
          <div>
            <p
              className={`text-2xl font-bold ${balanceUsd < 0 ? "text-green-600" : balanceUsd > 0 ? "text-destructive" : "text-foreground"}`}
            >
              {balanceUsd < 0 ? fmt(Math.abs(balanceUsd)) : fmt(balanceUsd)}
            </p>
            <p className="text-sm text-muted-foreground">
              {balanceUsd < 0 ? "Credit Balance" : balanceUsd > 0 ? "Outstanding Balance" : "No Balance"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total Invoiced: ${fmt(totalInvoicedUsd)} · Total Paid: ${fmt(totalPaidUsd)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Invoices table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No invoices found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => {
                    const balance = inv.total_usd - inv.paid_usd;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                        <TableCell>
                          {inv.term} {inv.academic_year}
                        </TableCell>
                        <TableCell className="text-right">${fmt(inv.total_usd)}</TableCell>
                        <TableCell className="text-right">${fmt(inv.paid_usd)}</TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            if (balance < 0) {
                              return <span className="text-green-600">+${fmt(Math.abs(balance))} credit</span>;
                            }
                            return fmt(balance);
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              inv.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : inv.status === "partial"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                            }
                          >
                            {inv.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment history */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                    <TableHead className="text-right">ZiG</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-center">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.receipt_number}</TableCell>
                      <TableCell>{format(new Date(p.payment_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-mono text-xs">{p.invoices?.invoice_number || "—"}</TableCell>
                      <TableCell className="text-right font-mono">${fmt(p.amount_usd)}</TableCell>
                      <TableCell className="text-right font-mono">ZiG {fmt(p.amount_zig)}</TableCell>
                      <TableCell>{p.payment_method}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            /* print receipt */
                          }}
                          title="Print Receipt"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
