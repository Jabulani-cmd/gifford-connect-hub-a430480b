// @ts-nocheck
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Printer, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildReceiptHtml, SCHOOL_LOGO_URL } from "@/lib/finance/pdf";
import { openPrintWindow } from "@/lib/finance/print";
import jsPDF from "jspdf";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReceiptSearchTab() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (search.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    const s = search.trim();
    const { data } = await supabase
      .from("payments")
      .select("*, students(full_name, admission_number, form), invoices(invoice_number)")
      .or(`receipt_number.ilike.%${s}%,students.full_name.ilike.%${s}%,students.admission_number.ilike.%${s}%`)
      .order("payment_date", { ascending: false })
      .limit(50);
    // Filter out nulls from join mismatches
    setResults((data || []).filter((p: any) => p.students));
    setLoading(false);
  }

  function printReceipt(payment: any) {
    const html = buildReceiptHtml({
      logoUrl: SCHOOL_LOGO_URL,
      receiptNumber: payment.receipt_number,
      paymentDate: payment.payment_date,
      student: {
        fullName: payment.students?.full_name || "—",
        admissionNumber: payment.students?.admission_number || "—",
        form: payment.students?.form,
      },
      invoiceNumber: payment.invoices?.invoice_number,
      amounts: { usd: Number(payment.amount_usd || 0), zig: Number(payment.amount_zig || 0) },
      paymentMethod: payment.payment_method,
      referenceNumber: payment.reference_number,
    });
    openPrintWindow(html);
  }

  function downloadReceipt(payment: any) {
    const html = buildReceiptHtml({
      logoUrl: SCHOOL_LOGO_URL,
      receiptNumber: payment.receipt_number,
      paymentDate: payment.payment_date,
      student: {
        fullName: payment.students?.full_name || "—",
        admissionNumber: payment.students?.admission_number || "—",
        form: payment.students?.form,
      },
      invoiceNumber: payment.invoices?.invoice_number,
      amounts: { usd: Number(payment.amount_usd || 0), zig: Number(payment.amount_zig || 0) },
      paymentMethod: payment.payment_method,
      referenceNumber: payment.reference_number,
    });
    // Open in new window for save-as
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Receipts</CardTitle>
        <CardDescription>Search and reprint receipts by receipt number, student name, or admission number</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by receipt #, student name, or admission #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        {searched && (
          results.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No receipts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Adm #</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                    <TableHead className="text-right">ZiG</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.receipt_number}</TableCell>
                      <TableCell>{p.payment_date}</TableCell>
                      <TableCell>{p.students?.full_name}</TableCell>
                      <TableCell className="font-mono text-xs">{p.students?.admission_number}</TableCell>
                      <TableCell className="font-mono text-xs">{p.invoices?.invoice_number || "—"}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(p.amount_usd))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(p.amount_zig))}</TableCell>
                      <TableCell>{p.payment_method}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => printReceipt(p)} title="Print">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => downloadReceipt(p)} title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
