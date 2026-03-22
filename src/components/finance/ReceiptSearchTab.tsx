import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Printer, Loader2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { openPrintWindow, buildReceiptHtml, SCHOOL_LOGO_URL } from "@/lib/finance/print";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReceiptSearchTab() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchReceipts = async () => {
    if (!searchTerm.trim()) {
      toast({ title: "Enter a search term", variant: "destructive" });
      return;
    }
    setLoading(true);
    setSearched(true);
    const term = `%${searchTerm.trim().toLowerCase()}%`;

    try {
      // Step 1: Find student IDs matching the term (by name or admission number)
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .or(`full_name.ilike.${term},admission_number.ilike.${term}`);

      const studentIds = students?.map((s) => s.id) || [];

      // Step 2: Find invoice numbers matching the term
      const { data: invoices } = await supabase.from("invoices").select("id").ilike("invoice_number", term);
      const invoiceIds = invoices?.map((i) => i.id) || [];

      // Step 3: Build query for payments
      let query = supabase.from("payments").select(`
          *,
          students:student_id (full_name, admission_number, form),
          invoices:invoice_id (invoice_number)
        `);

      // Apply filters: receipt number OR student OR invoice
      if (searchTerm.trim()) {
        const filters = [];
        filters.push(`receipt_number.ilike.${term}`);
        if (studentIds.length) filters.push(`student_id.in.(${studentIds.join(",")})`);
        if (invoiceIds.length) filters.push(`invoice_id.in.(${invoiceIds.join(",")})`);

        if (filters.length) {
          query = query.or(filters.join(","));
        } else {
          // No matches from students/invoices, try receipt number only
          query = query.ilike("receipt_number", term);
        }
      }

      const { data, error } = await query.order("payment_date", { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const viewReceipt = (payment: any) => {
    const receiptHtml = buildReceiptHtml({
      logoUrl: SCHOOL_LOGO_URL,
      receiptNumber: payment.receipt_number,
      paymentDate: payment.payment_date,
      student: {
        fullName: payment.students?.full_name || "—",
        admissionNumber: payment.students?.admission_number || "—",
        form: payment.students?.form || "—",
      },
      invoiceNumber: payment.invoices?.invoice_number,
      amounts: {
        usd: payment.amount_usd,
        zig: payment.amount_zig,
      },
      paymentMethod: payment.payment_method,
      referenceNumber: payment.reference_number,
    });
    const w = window.open("", "_blank");
    if (w) {
      w.document.open();
      w.document.write(receiptHtml);
      w.document.close();
    }
  };

  const printReceipt = (payment: any) => {
    const receiptHtml = buildReceiptHtml({
      logoUrl: SCHOOL_LOGO_URL,
      receiptNumber: payment.receipt_number,
      paymentDate: payment.payment_date,
      student: {
        fullName: payment.students?.full_name || "—",
        admissionNumber: payment.students?.admission_number || "—",
        form: payment.students?.form || "—",
      },
      invoiceNumber: payment.invoices?.invoice_number,
      amounts: {
        usd: payment.amount_usd,
        zig: payment.amount_zig,
      },
      paymentMethod: payment.payment_method,
      referenceNumber: payment.reference_number,
    });
    openPrintWindow(receiptHtml);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Receipt Search</CardTitle>
        <CardDescription>
          Find receipts by student name, admission number, receipt number, or invoice number.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, admission #, receipt #, or invoice #"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              onKeyDown={(e) => e.key === "Enter" && searchReceipts()}
            />
          </div>
          <Button onClick={searchReceipts} disabled={loading}>
            {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Search className="mr-1 h-4 w-4" />}
            Search
          </Button>
        </div>

        {searched && receipts.length === 0 && !loading && (
          <p className="text-center py-8 text-muted-foreground">No receipts found.</p>
        )}

        {receipts.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Adm #</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Amount USD</TableHead>
                  <TableHead className="text-right">Amount ZiG</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.receipt_number}</TableCell>
                    <TableCell>{format(new Date(p.payment_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>{p.students?.full_name}</TableCell>
                    <TableCell>{p.students?.admission_number}</TableCell>
                    <TableCell>{p.students?.form}</TableCell>
                    <TableCell className="font-mono text-xs">{p.invoices?.invoice_number || "—"}</TableCell>
                    <TableCell className="text-right font-mono">${fmt(p.amount_usd)}</TableCell>
                    <TableCell className="text-right font-mono">ZiG {fmt(p.amount_zig)}</TableCell>
                    <TableCell>{p.payment_method}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => viewReceipt(p)} title="View Receipt">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => printReceipt(p)} title="Print Receipt">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
