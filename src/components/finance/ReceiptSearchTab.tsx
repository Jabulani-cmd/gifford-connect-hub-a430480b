import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Printer, Loader2, Eye, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { openPrintWindow, buildReceiptHtml, SCHOOL_LOGO_URL } from "@/lib/finance/print";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReceiptSearchTab() {
  const { toast } = useToast();
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const searchStudents = async (query: string) => {
    if (query.length < 2) {
      setStudentResults([]);
      return;
    }
    const term = `%${query.toLowerCase()}%`;
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, admission_number, form")
      .or(`full_name.ilike.${term},admission_number.ilike.${term}`)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(10);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setStudentResults(data || []);
    }
  };

  const selectStudent = async (student: any) => {
    setSelectedStudent(student);
    setStudentSearch(student.full_name);
    setStudentResults([]);
    setReceiptLoading(true);
    const { data, error } = await supabase
      .from("payments")
      .select(
        `
        *,
        students:student_id (full_name, admission_number, form),
        invoices:invoice_id (invoice_number)
      `,
      )
      .eq("student_id", student.id)
      .order("payment_date", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setReceipts([]);
    } else {
      setReceipts(data || []);
    }
    setReceiptLoading(false);
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

  const clearSelection = () => {
    setSelectedStudent(null);
    setStudentSearch("");
    setReceipts([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Receipt Search</CardTitle>
        <CardDescription>Select a student to view and reprint receipts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Search Student</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Type student name or admission number..."
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                searchStudents(e.target.value);
              }}
              className="pl-9"
            />
          </div>
          {studentResults.length > 0 && (
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {studentResults.map((s) => (
                <div
                  key={s.id}
                  className="px-3 py-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                  onClick={() => selectStudent(s)}
                >
                  <div>
                    <p className="font-medium">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.admission_number} • {s.form}
                    </p>
                  </div>
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedStudent && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Selected Student:</p>
              <p className="text-lg font-semibold">{selectedStudent.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedStudent.admission_number} • {selectedStudent.form}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        )}

        {receiptLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        )}

        {!receiptLoading && selectedStudent && receipts.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">No receipts found for this student.</p>
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
