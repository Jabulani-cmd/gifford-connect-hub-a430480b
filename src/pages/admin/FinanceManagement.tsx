// @ts-nocheck
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import schoolLogo from "@/assets/school-logo.png";
import {
  buildInvoicePdf,
  buildInvoiceHtml,
  urlToDataUrl,
  buildStatementHtml,
  buildReceiptHtml,
  SCHOOL_LOGO_URL,
} from "@/lib/finance/pdf";
import ReceiptSearchTab from "@/components/finance/ReceiptSearchTab";
import { printReceipt, openPrintWindow } from "@/lib/finance/print";
import {
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Copy,
  FileText,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  Upload,
  Receipt,
  Ban,
  Send,
  BarChart3,
  Loader2,
  Printer,
  User,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  ChevronDown,
  Truck,
} from "lucide-react";
import BankReconciliation from "@/components/admin/BankReconciliation";
import IncomeExpenditureReport from "@/components/admin/IncomeExpenditureReport";

const formOptions = ["Form 1", "Form 2", "Form 3", "Form 4", "Lower 6", "Upper 6"];
const termOptions = ["Term 1", "Term 2", "Term 3"];
const boardingOptions = [
  { value: "day", label: "Day Scholar" },
  { value: "boarding", label: "Boarding" },
];
const paymentMethods = ["Cash", "EcoCash", "OneMoney", "Bank Transfer", "ZIPIT", "Swipe"];
const expenseCategories = [
  "Salaries",
  "Utilities",
  "Maintenance",
  "Supplies",
  "Transport",
  "Food",
  "Sports",
  "Petty Cash",
  "General",
];
const restrictionTypes = [
  "Block Report Cards",
  "Block Exam Results",
  "Block Library Access",
  "Block Sports Activities",
];

// ── helpers ──
const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const genInvoiceNum = () =>
  `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0")}`;
const genReceiptNum = () =>
  `RCPT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0")}`;

function statusBadge(status: string) {
  const map: Record<string, string> = {
    paid: "bg-green-100 text-green-800 border-green-300",
    partial: "bg-amber-100 text-amber-800 border-amber-300",
    unpaid: "bg-red-100 text-red-800 border-red-300",
    overdue: "bg-red-200 text-red-900 border-red-400",
  };
  return (
    <Badge variant="outline" className={map[status] || ""}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function FinanceManagement() {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const isFinanceOrAdmin =
    role === "finance" || role === "admin" || role === "admin_supervisor" || role === "principal";
  const isFinanceClerk = role === "finance"; // needs approval for destructive actions

  // Helper: request supervisor approval instead of direct delete
  async function requestApproval(
    actionType: string,
    targetTable: string,
    targetId: string,
    description: string,
    metadata?: any,
  ) {
    const { error } = await supabase.from("finance_approval_requests").insert({
      requested_by: user?.id,
      action_type: actionType,
      target_table: targetTable,
      target_id: targetId,
      description,
      metadata: metadata || {},
    });
    if (error) {
      toast({ title: "Error submitting request", description: error.message, variant: "destructive" });
      return false;
    }
    toast({
      title: "Approval requested",
      description: "Your request has been sent to the Admin Supervisor for approval.",
    });
    return true;
  }

  // ─── Fee Structures ───
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<any>(null);
  const [feeForm, setFeeForm] = useState({
    academic_year: "2026",
    term: "Term 1",
    form: "Form 1",
    boarding_status: "day",
    description: "",
    amount_usd: "",
    amount_zig: "",
  });
  const [feeLoading, setFeeLoading] = useState(false);

  // ─── Delete Impact Modal ───
  const [deleteImpactOpen, setDeleteImpactOpen] = useState(false);
  const [deleteTargetFee, setDeleteTargetFee] = useState<any>(null);
  const [deleteImpactCount, setDeleteImpactCount] = useState<number | null>(null);
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false);
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false);

  // ─── Invoices ───
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [invoiceTermFilter, setInvoiceTermFilter] = useState("all");
  const [bulkInvoiceOpen, setBulkInvoiceOpen] = useState(false);
  const [bulkYear, setBulkYear] = useState("2026");
  const [bulkTerm, setBulkTerm] = useState("Term 1");
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  // Single invoice
  const [singleInvOpen, setSingleInvOpen] = useState(false);
  const [singleInvForm, setSingleInvForm] = useState({
    student_search: "",
    student_id: "",
    academic_year: "2026",
    term: "Term 1",
    due_date: "",
    description: "",
    amount_usd: "",
    amount_zig: "",
  });
  const [singleInvStudentResults, setSingleInvStudentResults] = useState<any[]>([]);
  const [singleInvSelectedStudent, setSingleInvSelectedStudent] = useState<any>(null);
  const [singleInvLoading, setSingleInvLoading] = useState(false);
  // NEW: for fee structure selection in single invoice
  const [availableFeeStructures, setAvailableFeeStructures] = useState<any[]>([]);
  const [selectedFeeStructure, setSelectedFeeStructure] = useState<any>(null);

  // ─── Payments ───
  const [payments, setPayments] = useState<any[]>([]);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    student_search: "",
    invoice_id: "",
    amount_usd: "",
    amount_zig: "",
    payment_method: "Cash",
    reference_number: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentInvoices, setStudentInvoices] = useState<any[]>([]);
  const [payLoading, setPayLoading] = useState(false);

  // ─── Printing / PDFs ───
  const [pdfLoading, setPdfLoading] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  // ─── Debtor Restriction Settings ───
  const [restrictReportCards, setRestrictReportCards] = useState(false);
  const [restrictExamResults, setRestrictExamResults] = useState(false);
  const [restrictLoading, setRestrictLoading] = useState(false);

  // ─── Expenses ───
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expDialogOpen, setExpDialogOpen] = useState(false);
  const [expForm, setExpForm] = useState({
    expense_date: new Date().toISOString().split("T")[0],
    category: "General",
    description: "",
    amount_usd: "",
    amount_zig: "",
    payment_method: "Cash",
    reference_number: "",
  });
  const [expLoading, setExpLoading] = useState(false);
  const receiptFileRef = useRef<HTMLInputElement>(null);

  // ─── Debtors ───
  const [debtors, setDebtors] = useState<any[]>([]);
  const [debtorsFormFilter, setDebtorsFormFilter] = useState("all");
  const [deleteDebtorOpen, setDeleteDebtorOpen] = useState(false);
  const [debtorToDelete, setDebtorToDelete] = useState<any>(null);
  const [deletingDebtor, setDeletingDebtor] = useState(false);

  // ─── Petty Cash ───
  const [pettyCash, setPettyCash] = useState<any[]>([]);
  const [pcDialogOpen, setPcDialogOpen] = useState(false);
  const [pcForm, setPcForm] = useState({
    transaction_date: new Date().toISOString().split("T")[0],
    transaction_type: "withdrawal",
    description: "",
    amount_usd: "",
    amount_zig: "",
    reference_number: "",
  });
  const [pcLoading, setPcLoading] = useState(false);

  // ─── Supplier Invoices & Payments ───
  const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
  const [siDialogOpen, setSiDialogOpen] = useState(false);
  const [siForm, setSiForm] = useState({
    supplier_name: "",
    supplier_contact: "",
    invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    description: "",
    amount_usd: "",
    amount_zig: "",
  });
  const [siLoading, setSiLoading] = useState(false);
  const [spDialogOpen, setSpDialogOpen] = useState(false);
  const [spInvoice, setSpInvoice] = useState<any>(null);
  const [spForm, setSpForm] = useState({
    payment_date: new Date().toISOString().split("T")[0],
    amount_usd: "",
    amount_zig: "",
    payment_method: "Cash",
    reference_number: "",
    notes: "",
  });
  const [spLoading, setSpLoading] = useState(false);
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);

  // ─── Cash on Delivery (COD) ───
  const [codDialogOpen, setCodDialogOpen] = useState(false);
  const [codForm, setCodForm] = useState({
    supplier_name: "",
    supplier_contact: "",
    description: "",
    amount_usd: "",
    amount_zig: "",
    payment_method: "Cash",
    payment_date: new Date().toISOString().split("T")[0],
    reference_number: "",
    notes: "",
  });
  const [codLoading, setCodLoading] = useState(false);

  // ─── Student Statements ───
  const [stmtSearch, setStmtSearch] = useState("");
  const [stmtStudentResults, setStmtStudentResults] = useState<any[]>([]);
  const [stmtStudent, setStmtStudent] = useState<any>(null);
  const [stmtInvoices, setStmtInvoices] = useState<any[]>([]);
  const [stmtPayments, setStmtPayments] = useState<any[]>([]);
  const [stmtLoading, setStmtLoading] = useState(false);

  // ─── Loading ───
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchFeeStructures(),
      fetchInvoices(),
      fetchPayments(),
      fetchExpenses(),
      fetchPettyCash(),
      fetchSupplierInvoices(),
      fetchSupplierPayments(),
      fetchRestrictionSettings(),
    ]).finally(() => setLoading(false));

    // Realtime subscription for payments
    const channel = supabase
      .channel("finance-payments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        fetchPayments();
        fetchInvoices();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ═══ FETCH FUNCTIONS ═══
  async function fetchFeeStructures() {
    const { data } = await supabase.from("fee_structures").select("*").order("created_at", { ascending: false });
    if (data) setFeeStructures(data);
  }

  async function fetchInvoices() {
    const { data } = await supabase
      .from("invoices")
      .select("*, students(full_name, admission_number, form)")
      .order("created_at", { ascending: false });
    if (data) {
      setInvoices(data);
      // compute debtors
      const owing = data.filter((inv: any) => inv.status !== "paid");
      setDebtors(owing);
    }
  }

  async function fetchPayments() {
    const { data } = await supabase
      .from("payments")
      .select("*, students(full_name, admission_number), invoices(invoice_number)")
      .order("created_at", { ascending: false });
    if (data) setPayments(data);
  }

  async function fetchExpenses() {
    const { data } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
    if (data) setExpenses(data);
  }

  async function fetchPettyCash() {
    const { data } = await supabase.from("petty_cash").select("*").order("transaction_date", { ascending: false });
    if (data) setPettyCash(data);
  }

  async function fetchSupplierInvoices() {
    const { data } = await supabase.from("supplier_invoices").select("*").order("created_at", { ascending: false });
    if (data) setSupplierInvoices(data);
  }

  async function fetchSupplierPayments() {
    const { data } = await supabase
      .from("supplier_payments")
      .select("*, supplier_invoices(supplier_name, invoice_number)")
      .order("payment_date", { ascending: false });
    if (data) setSupplierPayments(data);
  }

  async function savePettyCash() {
    setPcLoading(true);
    const payload = {
      transaction_date: pcForm.transaction_date,
      transaction_type: pcForm.transaction_type,
      description: pcForm.description,
      amount_usd: parseFloat(pcForm.amount_usd) || 0,
      amount_zig: parseFloat(pcForm.amount_zig) || 0,
      reference_number: pcForm.reference_number || null,
      recorded_by: user?.id,
    };
    const { error } = await supabase.from("petty_cash").insert(payload);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setPcLoading(false);
      return;
    }
    toast({
      title: pcForm.transaction_type === "deposit" ? "Petty cash deposit recorded" : "Petty cash withdrawal recorded",
    });
    setPcDialogOpen(false);
    setPcLoading(false);
    fetchPettyCash();
  }

  async function deletePettyCash(id: string, description?: string) {
    if (isFinanceClerk) {
      await requestApproval("delete_petty_cash", "petty_cash", id, `Delete petty cash: ${description || id}`);
      return;
    }
    await supabase.from("petty_cash").delete().eq("id", id);
    toast({ title: "Petty cash entry deleted" });
    fetchPettyCash();
  }

  async function saveSupplierInvoice() {
    setSiLoading(true);
    const payload = {
      supplier_name: siForm.supplier_name,
      supplier_contact: siForm.supplier_contact || null,
      invoice_number: siForm.invoice_number,
      invoice_date: siForm.invoice_date,
      due_date: siForm.due_date || null,
      description: siForm.description || null,
      amount_usd: parseFloat(siForm.amount_usd) || 0,
      amount_zig: parseFloat(siForm.amount_zig) || 0,
      recorded_by: user?.id,
    };
    const { error } = await supabase.from("supplier_invoices").insert(payload);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSiLoading(false);
      return;
    }
    toast({ title: "Supplier invoice recorded" });
    setSiDialogOpen(false);
    setSiLoading(false);
    fetchSupplierInvoices();
  }

  async function deleteSupplierInvoice(id: string, description?: string) {
    if (isFinanceClerk) {
      await requestApproval(
        "delete_supplier_invoice",
        "supplier_invoices",
        id,
        `Delete supplier invoice: ${description || id}`,
      );
      return;
    }
    await supabase.from("supplier_invoices").delete().eq("id", id);
    toast({ title: "Supplier invoice deleted" });
    fetchSupplierInvoices();
  }

  async function saveSupplierPayment() {
    if (!spInvoice) return;
    setSpLoading(true);
    const payUsd = parseFloat(spForm.amount_usd) || 0;
    const payZig = parseFloat(spForm.amount_zig) || 0;
    const { error } = await supabase.from("supplier_payments").insert({
      supplier_invoice_id: spInvoice.id,
      payment_date: spForm.payment_date,
      amount_usd: payUsd,
      amount_zig: payZig,
      payment_method: spForm.payment_method,
      reference_number: spForm.reference_number || null,
      notes: spForm.notes || null,
      recorded_by: user?.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSpLoading(false);
      return;
    }
    // Update supplier invoice paid amounts and status
    const newPaidUsd = Number(spInvoice.paid_usd) + payUsd;
    const newPaidZig = Number(spInvoice.paid_zig) + payZig;
    const newStatus = newPaidUsd >= Number(spInvoice.amount_usd) ? "paid" : newPaidUsd > 0 ? "partial" : "unpaid";
    await supabase
      .from("supplier_invoices")
      .update({ paid_usd: newPaidUsd, paid_zig: newPaidZig, status: newStatus })
      .eq("id", spInvoice.id);
    toast({ title: "Supplier payment recorded" });
    setSpDialogOpen(false);
    setSpLoading(false);
    fetchSupplierInvoices();
    fetchSupplierPayments();
  }

  async function saveCodPayment() {
    setCodLoading(true);
    // Create a supplier invoice marked as paid + a matching payment
    const invNumber = `COD-${Date.now()}`;
    const amtUsd = parseFloat(codForm.amount_usd) || 0;
    const amtZig = parseFloat(codForm.amount_zig) || 0;
    const { data: inv, error: invErr } = await supabase
      .from("supplier_invoices")
      .insert({
        supplier_name: codForm.supplier_name,
        supplier_contact: codForm.supplier_contact || null,
        invoice_number: invNumber,
        invoice_date: codForm.payment_date,
        description: codForm.description || "Cash on Delivery",
        amount_usd: amtUsd,
        amount_zig: amtZig,
        paid_usd: amtUsd,
        paid_zig: amtZig,
        status: "paid",
        recorded_by: user?.id,
      })
      .select()
      .single();
    if (invErr) {
      toast({ title: "Error", description: invErr.message, variant: "destructive" });
      setCodLoading(false);
      return;
    }
    await supabase.from("supplier_payments").insert({
      supplier_invoice_id: inv.id,
      payment_date: codForm.payment_date,
      amount_usd: amtUsd,
      amount_zig: amtZig,
      payment_method: codForm.payment_method,
      reference_number: codForm.reference_number || null,
      notes: codForm.notes || "Cash on Delivery",
      recorded_by: user?.id,
    });
    toast({ title: "Cash on delivery payment recorded" });
    setCodDialogOpen(false);
    setCodLoading(false);
    setCodForm({
      supplier_name: "",
      supplier_contact: "",
      description: "",
      amount_usd: "",
      amount_zig: "",
      payment_method: "Cash",
      payment_date: new Date().toISOString().split("T")[0],
      reference_number: "",
      notes: "",
    });
    fetchSupplierInvoices();
    fetchSupplierPayments();
  }

  async function fetchRestrictionSettings() {
    const { data } = await supabase
      .from("site_settings")
      .select("*")
      .in("setting_key", ["restrict_report_cards", "restrict_exam_results"]);
    if (data) {
      data.forEach((s: any) => {
        if (s.setting_key === "restrict_report_cards") setRestrictReportCards(s.setting_value === "true");
        if (s.setting_key === "restrict_exam_results") setRestrictExamResults(s.setting_value === "true");
      });
    }
  }

  function openAddFee() {
    setEditingFee(null);
    setFeeForm({
      academic_year: "2026",
      term: "Term 1",
      form: "Form 1",
      boarding_status: "day",
      description: "",
      amount_usd: "",
      amount_zig: "",
    });
    setFeeDialogOpen(true);
  }

  function openEditFee(fee: any) {
    setEditingFee(fee);
    setFeeForm({
      academic_year: fee.academic_year,
      term: fee.term,
      form: fee.form,
      boarding_status: fee.boarding_status,
      description: fee.description || "",
      amount_usd: String(fee.amount_usd),
      amount_zig: String(fee.amount_zig),
    });
    setFeeDialogOpen(true);
  }

  async function duplicateFee(fee: any) {
    const { error } = await supabase.from("fee_structures").insert({
      academic_year: fee.academic_year,
      term: fee.term,
      form: fee.form,
      boarding_status: fee.boarding_status,
      description: fee.description,
      amount_usd: fee.amount_usd,
      amount_zig: fee.amount_zig,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Fee structure duplicated" });
    fetchFeeStructures();
  }

  async function saveFee() {
    setFeeLoading(true);
    const payload = {
      academic_year: feeForm.academic_year,
      term: feeForm.term,
      form: feeForm.form,
      boarding_status: feeForm.boarding_status,
      description: feeForm.description || null,
      amount_usd: parseFloat(feeForm.amount_usd) || 0,
      amount_zig: parseFloat(feeForm.amount_zig) || 0,
    };
    if (editingFee) {
      const { error } = await supabase.from("fee_structures").update(payload).eq("id", editingFee.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setFeeLoading(false);
        return;
      }
      toast({ title: "Fee structure updated" });
    } else {
      const { error } = await supabase.from("fee_structures").insert(payload);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setFeeLoading(false);
        return;
      }
      toast({ title: "Fee structure created" });
    }
    setFeeDialogOpen(false);
    setFeeLoading(false);
    fetchFeeStructures();
  }

  async function openDeleteImpact(fee: any) {
    setDeleteTargetFee(fee);
    setDeleteImpactCount(null);
    setDeleteImpactOpen(true);
    setDeleteImpactLoading(true);

    const { count, error } = await supabase
      .from("invoice_items")
      .select("id", { count: "exact", head: true })
      .eq("fee_structure_id", fee.id);

    setDeleteImpactCount(error ? -1 : (count ?? 0));
    setDeleteImpactLoading(false);
  }

  async function confirmDeleteFee() {
    if (!deleteTargetFee) return;

    if (isFinanceClerk) {
      const desc = `Delete fee structure: ${deleteTargetFee.form} ${deleteTargetFee.term} ${deleteTargetFee.academic_year} (${deleteTargetFee.boarding_status})`;
      await requestApproval("delete_fee_structure", "fee_structures", deleteTargetFee.id, desc);
      setDeleteImpactOpen(false);
      setDeleteTargetFee(null);
      return;
    }

    setDeleteConfirmLoading(true);
    const id = deleteTargetFee.id;

    const { error: unlinkError } = await supabase
      .from("invoice_items")
      .update({ fee_structure_id: null })
      .eq("fee_structure_id", id);

    if (unlinkError) {
      toast({ title: "Failed to delete fee structure", description: unlinkError.message, variant: "destructive" });
      setDeleteConfirmLoading(false);
      return;
    }

    const { data: deletedRows, error: deleteError } = await supabase
      .from("fee_structures")
      .delete()
      .eq("id", id)
      .select("id");

    if (deleteError) {
      toast({ title: "Failed to delete fee structure", description: deleteError.message, variant: "destructive" });
      setDeleteConfirmLoading(false);
      return;
    }

    if (!deletedRows || deletedRows.length === 0) {
      toast({
        title: "Fee structure was not deleted",
        description: "Permission or record mismatch issue.",
        variant: "destructive",
      });
      setDeleteConfirmLoading(false);
      return;
    }

    setFeeStructures((prev) => prev.filter((fee) => fee.id !== id));
    toast({ title: "Fee structure deleted" });
    setDeleteImpactOpen(false);
    setDeleteTargetFee(null);
    setDeleteConfirmLoading(false);
    fetchFeeStructures();
  }

  // ═══ STUDENT STATEMENTS ═══
  async function searchStmtStudents(query: string) {
    if (query.length < 2) {
      setStmtStudentResults([]);
      return;
    }
    const { data } = await supabase
      .from("students")
      .select("id, full_name, admission_number, form")
      .or(`full_name.ilike.%${query}%,admission_number.ilike.%${query}%`)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(10);
    if (data) setStmtStudentResults(data);
  }

  async function selectStmtStudent(student: any) {
    setStmtStudent(student);
    setStmtStudentResults([]);
    setStmtSearch(student.full_name);
    setStmtLoading(true);
    const [invRes, payRes] = await Promise.all([
      supabase.from("invoices").select("*").eq("student_id", student.id).order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("*, invoices(invoice_number)")
        .eq("student_id", student.id)
        .order("payment_date", { ascending: false }),
    ]);
    setStmtInvoices(invRes.data || []);
    setStmtPayments(payRes.data || []);
    setStmtLoading(false);
  }

  function clearStmtStudent() {
    setStmtStudent(null);
    setStmtSearch("");
    setStmtInvoices([]);
    setStmtPayments([]);
  }

  function printStudentStatement() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const totalInvoicedUsd = stmtInvoices.reduce((s, i) => s + parseFloat(i.total_usd), 0);
    const totalInvoicedZig = stmtInvoices.reduce((s, i) => s + parseFloat(i.total_zig), 0);
    const totalPaidUsd = stmtPayments.reduce((s, p) => s + parseFloat(p.amount_usd), 0);
    const totalPaidZig = stmtPayments.reduce((s, p) => s + parseFloat(p.amount_zig), 0);
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Statement - ${stmtStudent.full_name}</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;font-size:12px}h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;margin-top:20px;border-bottom:1px solid #ccc;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5;font-weight:600}
      .right{text-align:right}.mono{font-family:monospace}.summary{margin-top:16px;padding:12px;border:2px solid #333;display:inline-block}
      .red{color:#c00}.green{color:#060}@media print{body{padding:15px}}</style></head><body>
      <h1>Gifford High School</h1>
      <p><strong>Student Financial Statement</strong></p>
      <p>Student: <strong>${stmtStudent.full_name}</strong> | Adm #: <strong>${stmtStudent.admission_number}</strong> | Form: <strong>${stmtStudent.form}</strong></p>
      <p>Date: ${new Date().toLocaleDateString()}</p>
      <h2>Invoices</h2>
       table<thead> th<th>Invoice #</th><th>Term</th><th>Year</th><th class="right">Total USD</th><th class="right">Total ZiG</th><th class="right">Paid USD</th><th class="right">Paid ZiG</th><th>Status</th> </thead>
      <tbody>
      ${stmtInvoices.map((i) => ` <tr><td class="mono">${i.invoice_number}</td><td>${i.term}</td><td>${i.academic_year}</td><td class="right mono">${fmt(parseFloat(i.total_usd))}</td><td class="right mono">${fmt(parseFloat(i.total_zig))}</td><td class="right mono">${fmt(parseFloat(i.paid_usd))}</td><td class="right mono">${fmt(parseFloat(i.paid_zig))}</td><td>${i.status}</td></tr>`).join("")}
      </tbody> </table>
      <h2>Payments</h2>
       table<thead> <tr><th>Receipt #</th><th>Date</th><th>Invoice</th><th class="right">USD</th><th class="right">ZiG</th><th>Method</th></tr> </thead>
      <tbody>
      ${stmtPayments.map((p) => ` <tr><td class="mono">${p.receipt_number}</td><td>${p.payment_date}</td><td class="mono">${p.invoices?.invoice_number || "—"}</td><td class="right mono">${fmt(parseFloat(p.amount_usd))}</td><td class="right mono">${fmt(parseFloat(p.amount_zig))}</td><td>${p.payment_method}</td></tr>`).join("")}
      </tbody> </table>
      <div class="summary">
        <p><strong>Total Invoiced:</strong> USD ${fmt(totalInvoicedUsd)} / ZiG ${fmt(totalInvoicedZig)}</p>
        <p><strong>Total Paid:</strong> USD ${fmt(totalPaidUsd)} / ZiG ${fmt(totalPaidZig)}</p>
        <p class="${totalInvoicedUsd - totalPaidUsd > 0 ? "red" : "green"}"><strong>Balance:</strong> USD ${fmt(totalInvoicedUsd - totalPaidUsd)} / ZiG ${fmt(totalInvoicedZig - totalPaidZig)}</p>
      </div>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  }

  function printDebtorsList() {
    const filtered =
      debtorsFormFilter === "all" ? debtors : debtors.filter((d) => d.students?.form === debtorsFormFilter);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const totalUsd = filtered.reduce((s, d) => s + (parseFloat(d.total_usd) - parseFloat(d.paid_usd)), 0);
    const totalZig = filtered.reduce((s, d) => s + (parseFloat(d.total_zig) - parseFloat(d.paid_zig)), 0);
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Debtors List</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;font-size:12px}h1{font-size:18px;margin-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5;font-weight:600}
      .right{text-align:right}.mono{font-family:monospace}.red{color:#c00}.total{font-weight:bold;background:#fef2f2}
      @media print{body{padding:15px}}</style></head><body>
      <h1>Gifford High School — Debtors List</h1>
      <p>Date: ${new Date().toLocaleDateString()} | Filter: ${debtorsFormFilter === "all" ? "All Forms" : debtorsFormFilter} | Total: ${filtered.length} student(s)</p>
       table<thead> <tr><th>#</th><th>Student</th><th>Adm #</th><th>Form</th><th>Invoice</th><th>Term</th><th class="right">Owed USD</th><th class="right">Owed ZiG</th><th>Status</th></tr> </thead>
      <tbody>
      ${filtered.map((d, i) => ` <tr><td>${i + 1}</td><td>${d.students?.full_name || "—"}</td><td>${d.students?.admission_number || "—"}</td><td>${d.students?.form || "—"}</td><td class="mono">${d.invoice_number}</td><td>${d.term}</td><td class="right mono red">${fmt(parseFloat(d.total_usd) - parseFloat(d.paid_usd))}</td><td class="right mono red">${fmt(parseFloat(d.total_zig) - parseFloat(d.paid_zig))}</td><td>${d.status}</td></tr>`).join("")}
      <tr class="total"><td colspan="6">TOTAL</td><td class="right mono red">USD ${fmt(totalUsd)}</td><td class="right mono red">ZiG ${fmt(totalZig)}</td><td></td></tr>
      </tbody> </table>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  }

  // ═══ INVOICE GENERATION (UPDATED) ═══
  async function generateBulkInvoices() {
    setBulkLoading(true);
    try {
      // Get active students (including boarding_status)
      const { data: students } = await supabase
        .from("students")
        .select("id, full_name, form, boarding_status, stream")
        .eq("status", "active")
        .is("deleted_at", null);
      if (!students || students.length === 0) {
        toast({ title: "No active students found", variant: "destructive" });
        setBulkLoading(false);
        return;
      }

      // Get fee structures for this term/year (active only)
      const { data: feeStructures } = await supabase
        .from("fee_structures")
        .select("*")
        .eq("academic_year", bulkYear)
        .eq("term", bulkTerm)
        .eq("is_active", true);
      if (!feeStructures || feeStructures.length === 0) {
        toast({ title: "No fee structures found for this term", variant: "destructive" });
        setBulkLoading(false);
        return;
      }

      let created = 0;
      for (const student of students) {
        // Skip if invoice already exists for this student/term/year
        const { data: existing } = await supabase
          .from("invoices")
          .select("id")
          .eq("student_id", student.id)
          .eq("academic_year", bulkYear)
          .eq("term", bulkTerm);
        if (existing && existing.length > 0) continue;

        // Find fee structures that apply to this student
        const applicableFees = feeStructures.filter((fs) => {
          if (fs.form && fs.form !== student.form) return false;
          if (fs.boarding_status && fs.boarding_status !== student.boarding_status) return false;
          return true;
        });
        if (applicableFees.length === 0) continue; // no fees for this student

        // Calculate totals
        const totalUsd = applicableFees.reduce((sum, fs) => sum + fs.amount_usd, 0);
        const totalZig = applicableFees.reduce((sum, fs) => sum + fs.amount_zig, 0);

        // Generate a simple invoice number (improve as needed)
        const invoiceNumber = `INV-${bulkYear.slice(-2)}-${bulkTerm.replace("Term ", "T")}-${String(created + 1).padStart(4, "0")}`;

        // Insert invoice header
        const { data: inv, error } = await supabase
          .from("invoices")
          .insert({
            invoice_number: invoiceNumber,
            student_id: student.id,
            academic_year: bulkYear,
            term: bulkTerm,
            total_usd: totalUsd,
            total_zig: totalZig,
            due_date: bulkDueDate || null,
            status: "unpaid",
            paid_usd: 0,
            paid_zig: 0,
          })
          .select()
          .single();

        if (error) {
          console.error("Invoice insert error:", error);
          continue;
        }

        // Insert invoice items (one per fee structure)
        for (const fs of applicableFees) {
          await supabase.from("invoice_items").insert({
            invoice_id: inv.id,
            fee_structure_id: fs.id,
            description:
              fs.description || `${fs.form} - ${fs.boarding_status === "boarding" ? "Boarding" : "Day"} Fees`,
            amount_usd: fs.amount_usd,
            amount_zig: fs.amount_zig,
          });
        }
        created++;
      }

      toast({ title: `${created} invoices generated` });
      setBulkInvoiceOpen(false);
      fetchInvoices();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setBulkLoading(false);
  }

  // ═══ SINGLE STUDENT INVOICE (UPDATED) ═══
  async function searchSingleInvStudents(query: string) {
    if (query.length < 2) {
      setSingleInvStudentResults([]);
      return;
    }
    const { data } = await supabase
      .from("students")
      .select("id, full_name, admission_number, form, boarding_status")
      .or(`full_name.ilike.%${query}%,admission_number.ilike.%${query}%`)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(10);
    if (data) setSingleInvStudentResults(data);
  }

  function selectSingleInvStudent(student: any) {
    setSingleInvSelectedStudent(student);
    setSingleInvStudentResults([]);
    setSingleInvForm((f) => ({ ...f, student_search: student.full_name, student_id: student.id }));
    // Fetch applicable fee structures for this student based on selected term/year
    fetchFeeStructuresForStudent(student);
  }

  async function fetchFeeStructuresForStudent(student: any) {
    if (!student) return;
    const { data: fs } = await supabase
      .from("fee_structures")
      .select("*")
      .eq("academic_year", singleInvForm.academic_year)
      .eq("term", singleInvForm.term)
      .eq("is_active", true);
    if (fs) {
      const applicable = fs.filter(
        (f) =>
          (!f.form || f.form === student.form) && (!f.boarding_status || f.boarding_status === student.boarding_status),
      );
      setAvailableFeeStructures(applicable);
      if (applicable.length > 0) {
        setSelectedFeeStructure(applicable[0]);
        setSingleInvForm((f) => ({
          ...f,
          amount_usd: String(applicable[0].amount_usd),
          amount_zig: String(applicable[0].amount_zig),
          description: applicable[0].description || "",
        }));
      } else {
        setSelectedFeeStructure(null);
        setSingleInvForm((f) => ({ ...f, amount_usd: "", amount_zig: "", description: "" }));
      }
    }
  }

  async function createSingleInvoice() {
    if (!singleInvSelectedStudent) {
      toast({ title: "Select a student", variant: "destructive" });
      return;
    }
    const usd = parseFloat(singleInvForm.amount_usd) || 0;
    const zig = parseFloat(singleInvForm.amount_zig) || 0;
    if (usd === 0 && zig === 0) {
      toast({ title: "Enter an amount", variant: "destructive" });
      return;
    }
    setSingleInvLoading(true);
    try {
      const invoiceNumber = genInvoiceNum();
      const { data: inv, error } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          student_id: singleInvSelectedStudent.id,
          academic_year: singleInvForm.academic_year,
          term: singleInvForm.term,
          total_usd: usd,
          total_zig: zig,
          due_date: singleInvForm.due_date || null,
          status: "unpaid",
          paid_usd: 0,
          paid_zig: 0,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert invoice item(s) – if fee_structure_id is available, use it
      const feeStructureId = selectedFeeStructure?.id || null;
      await supabase.from("invoice_items").insert({
        invoice_id: inv.id,
        fee_structure_id: feeStructureId,
        description: singleInvForm.description || `${singleInvForm.term} ${singleInvForm.academic_year} Fees`,
        amount_usd: usd,
        amount_zig: zig,
      });

      toast({
        title: "Invoice created",
        description: `Invoice ${invoiceNumber} created for ${singleInvSelectedStudent.full_name}`,
      });
      downloadInvoicePdf(inv, singleInvSelectedStudent, [
        {
          description: singleInvForm.description || `${singleInvForm.term} ${singleInvForm.academic_year} Fees`,
          amount_usd: usd,
          amount_zig: zig,
        },
      ]);
      setSingleInvOpen(false);
      setSingleInvSelectedStudent(null);
      setSingleInvForm({
        student_search: "",
        student_id: "",
        academic_year: "2026",
        term: "Term 1",
        due_date: "",
        description: "",
        amount_usd: "",
        amount_zig: "",
      });
      fetchInvoices();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSingleInvLoading(false);
  }

  async function downloadInvoicePdf(inv: any, student?: any, items?: any[]) {
    setPdfLoading(true);
    try {
      let logoDataUrl: string | undefined;
      try {
        logoDataUrl = await urlToDataUrl(SCHOOL_LOGO_URL);
      } catch {}
      let invoiceItems = items;
      if (!invoiceItems) {
        const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
        invoiceItems = data || [];
      }
      const doc = buildInvoicePdf({
        logoDataUrl,
        invoiceNumber: inv.invoice_number,
        academicYear: inv.academic_year,
        term: inv.term,
        dueDate: inv.due_date,
        student: {
          fullName: student?.full_name || inv.students?.full_name || "—",
          admissionNumber: student?.admission_number || inv.students?.admission_number || "—",
          form: student?.form || inv.students?.form,
        },
        items: invoiceItems.map((it: any) => ({
          description: it.description,
          amount_usd: it.amount_usd,
          amount_zig: it.amount_zig,
        })),
        totals: { total_usd: inv.total_usd, total_zig: inv.total_zig, paid_usd: inv.paid_usd, paid_zig: inv.paid_zig },
      });
      doc.save(`${inv.invoice_number}.pdf`);
    } catch (err: any) {
      toast({ title: "Error generating PDF", description: err.message, variant: "destructive" });
    }
    setPdfLoading(false);
  }

  async function viewInvoiceHtml(inv: any) {
    try {
      let invoiceItems: any[] = [];
      const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
      invoiceItems = data || [];
      const html = buildInvoiceHtml({
        logoDataUrl: SCHOOL_LOGO_URL,
        invoiceNumber: inv.invoice_number,
        academicYear: inv.academic_year,
        term: inv.term,
        dueDate: inv.due_date,
        student: {
          fullName: inv.students?.full_name || "—",
          admissionNumber: inv.students?.admission_number || "—",
          form: inv.students?.form,
        },
        items: invoiceItems.map((it: any) => ({
          description: it.description,
          amount_usd: it.amount_usd,
          amount_zig: it.amount_zig,
        })),
        totals: { total_usd: inv.total_usd, total_zig: inv.total_zig, paid_usd: inv.paid_usd, paid_zig: inv.paid_zig },
      });
      return html;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return null;
    }
  }

  async function openViewInvoice(inv: any) {
    const html = await viewInvoiceHtml(inv);
    if (html) {
      const w = window.open("", "_blank");
      if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
      }
    }
  }

  async function printInvoice(inv: any) {
    const html = await viewInvoiceHtml(inv);
    if (html) openPrintWindow(html);
  }

  // ═══ PAYMENT PROCESSING ═══
  async function searchStudents(query: string) {
    if (query.length < 2) {
      setStudentResults([]);
      return;
    }
    const { data } = await supabase
      .from("students")
      .select("id, full_name, admission_number, form")
      .or(`full_name.ilike.%${query}%,admission_number.ilike.%${query}%`)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(10);
    if (data) setStudentResults(data);
  }

  async function selectStudentForPayment(student: any) {
    setSelectedStudent(student);
    setStudentResults([]);
    setPayForm((p) => ({ ...p, student_search: student.full_name }));
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("student_id", student.id)
      .neq("status", "paid")
      .order("created_at");
    if (data) {
      setStudentInvoices(data);
      if (data.length === 1) {
        setPayForm((p) => ({ ...p, student_search: student.full_name, invoice_id: data[0].id }));
      }
    }
  }

  async function recordPayment() {
    if (!selectedStudent) {
      toast({ title: "Please select a student", variant: "destructive" });
      return;
    }
    if (!payForm.invoice_id && studentInvoices.length > 0) {
      toast({ title: "Please select an invoice", variant: "destructive" });
      return;
    }
    const usd = parseFloat(payForm.amount_usd) || 0;
    const zig = parseFloat(payForm.amount_zig) || 0;
    if (usd === 0 && zig === 0) {
      toast({ title: "Enter an amount", variant: "destructive" });
      return;
    }

    setPayLoading(true);
    try {
      const receiptNumber = genReceiptNum();
      let invoiceId = payForm.invoice_id || null;
      let invoiceNumber: string | null = null;

      // If no invoice selected (advance payment), auto-create one
      if (!invoiceId) {
        const invNum = genInvoiceNum();
        const { data: newInv, error: invErr } = await supabase
          .from("invoices")
          .insert({
            invoice_number: invNum,
            student_id: selectedStudent.id,
            academic_year: new Date().getFullYear().toString(),
            term: "Term 1",
            total_usd: usd,
            total_zig: zig,
            due_date: null,
            status: "paid",
            paid_usd: usd,
            paid_zig: zig,
            notes: "Auto-generated for advance payment",
          })
          .select()
          .single();
        if (invErr) throw invErr;
        invoiceId = newInv.id;
        invoiceNumber = invNum;
        // Create invoice item
        await supabase.from("invoice_items").insert({
          invoice_id: newInv.id,
          description: "Advance Payment",
          amount_usd: usd,
          amount_zig: zig,
        });
      }

      const { error } = await supabase.from("payments").insert({
        receipt_number: receiptNumber,
        invoice_id: invoiceId,
        student_id: selectedStudent.id,
        amount_usd: usd,
        amount_zig: zig,
        payment_method: payForm.payment_method,
        reference_number: payForm.reference_number || null,
        payment_date: payForm.payment_date,
        recorded_by: user?.id || null,
        notes: payForm.notes || null,
      });
      if (error) throw error;

      // Update invoice paid amounts (if paying against existing invoice)
      if (payForm.invoice_id) {
        const invoice = studentInvoices.find((i) => i.id === payForm.invoice_id);
        if (invoice) {
          const newPaidUsd = parseFloat(invoice.paid_usd) + usd;
          const newPaidZig = parseFloat(invoice.paid_zig) + zig;
          const totalUsd = parseFloat(invoice.total_usd);
          const totalZig = parseFloat(invoice.total_zig);
          let newStatus = "partial";
          if (newPaidUsd >= totalUsd && newPaidZig >= totalZig) newStatus = "paid";
          else if (newPaidUsd === 0 && newPaidZig === 0) newStatus = "unpaid";
          await supabase
            .from("invoices")
            .update({
              paid_usd: newPaidUsd,
              paid_zig: newPaidZig,
              status: newStatus,
            })
            .eq("id", payForm.invoice_id);
          invoiceNumber = invoice.invoice_number;
        }
      }

      toast({ title: "Payment recorded", description: `Receipt: ${receiptNumber}` });

      // Auto-generate receipt for printing
      const receiptHtml = buildReceiptHtml({
        logoUrl: SCHOOL_LOGO_URL,
        receiptNumber,
        paymentDate: payForm.payment_date,
        student: {
          fullName: selectedStudent.full_name,
          admissionNumber: selectedStudent.admission_number,
          form: selectedStudent.form,
        },
        invoiceNumber,
        amounts: { usd, zig },
        paymentMethod: payForm.payment_method,
        referenceNumber: payForm.reference_number,
      });
      const w = window.open("", "_blank");
      if (w) {
        w.document.open();
        w.document.write(receiptHtml);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 300);
      }

      setPayDialogOpen(false);
      setSelectedStudent(null);
      setStudentInvoices([]);
      setPayForm({
        student_search: "",
        invoice_id: "",
        amount_usd: "",
        amount_zig: "",
        payment_method: "Cash",
        reference_number: "",
        payment_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      fetchInvoices();
      fetchPayments();
      if (stmtStudent) selectStmtStudent(stmtStudent);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setPayLoading(false);
  }

  // ═══ EXPENSE RECORDING ═══
  async function saveExpense() {
    if (!expForm.description) {
      toast({ title: "Description required", variant: "destructive" });
      return;
    }
    setExpLoading(true);
    const { error } = await supabase.from("expenses").insert({
      expense_date: expForm.expense_date,
      category: expForm.category,
      description: expForm.description,
      amount_usd: parseFloat(expForm.amount_usd) || 0,
      amount_zig: parseFloat(expForm.amount_zig) || 0,
      payment_method: expForm.payment_method,
      reference_number: expForm.reference_number || null,
      recorded_by: user?.id || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setExpLoading(false);
      return;
    }
    toast({ title: "Expense recorded" });
    setExpDialogOpen(false);
    setExpForm({
      expense_date: new Date().toISOString().split("T")[0],
      category: "General",
      description: "",
      amount_usd: "",
      amount_zig: "",
      payment_method: "Cash",
      reference_number: "",
    });
    setExpLoading(false);
    fetchExpenses();
  }

  async function deleteExpense(id: string, description?: string) {
    if (isFinanceClerk) {
      await requestApproval("delete_expense", "expenses", id, `Delete expense: ${description || id}`);
      return;
    }
    if (!confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    toast({ title: "Expense deleted" });
    fetchExpenses();
  }

  async function deletePayment(payment: any) {
    if (isFinanceClerk) {
      await requestApproval(
        "void_payment",
        "payments",
        payment.id,
        `Void payment ${payment.receipt_number} ($${fmt(Number(payment.amount_usd))})`,
        {
          invoice_id: payment.invoice_id,
          amount_usd: payment.amount_usd,
          amount_zig: payment.amount_zig,
        },
      );
      return;
    }
    if (!confirm(`Delete payment ${payment.receipt_number}? This will reverse the paid amounts on the linked invoice.`))
      return;
    try {
      const { data: invoice } = await supabase.from("invoices").select("*").eq("id", payment.invoice_id).single();
      if (invoice) {
        const newPaidUsd = Math.max(0, Number(invoice.paid_usd) - Number(payment.amount_usd));
        const newPaidZig = Math.max(0, Number(invoice.paid_zig) - Number(payment.amount_zig));
        let newStatus = "partial";
        if (newPaidUsd === 0 && newPaidZig === 0) newStatus = "unpaid";
        else if (newPaidUsd >= Number(invoice.total_usd) && newPaidZig >= Number(invoice.total_zig)) newStatus = "paid";
        await supabase
          .from("invoices")
          .update({ paid_usd: newPaidUsd, paid_zig: newPaidZig, status: newStatus })
          .eq("id", payment.invoice_id);
      }
      await supabase.from("audit_logs").insert({
        action: "delete_payment",
        table_name: "payments",
        record_id: payment.id,
        user_id: user?.id || null,
        old_data: payment,
      });
      const { error } = await supabase.from("payments").delete().eq("id", payment.id);
      if (error) throw error;
      toast({
        title: "Payment deleted",
        description: `Receipt ${payment.receipt_number} removed and invoice updated.`,
      });
      fetchPayments();
      fetchInvoices();
      if (stmtStudent) selectStmtStudent(stmtStudent);
    } catch (err: any) {
      toast({ title: "Error deleting payment", description: err.message, variant: "destructive" });
    }
  }

  async function deleteInvoice(invoice: any) {
    if (isFinanceClerk) {
      await requestApproval(
        "void_invoice",
        "invoices",
        invoice.id,
        `Void invoice ${invoice.invoice_number} ($${fmt(Number(invoice.total_usd))})`,
      );
      return;
    }
    if (
      !confirm(
        `Delete invoice ${invoice.invoice_number}? This will also delete all associated payments and invoice items.`,
      )
    )
      return;
    try {
      await supabase.from("payments").delete().eq("invoice_id", invoice.id);
      await supabase.from("invoice_items").delete().eq("invoice_id", invoice.id);
      await supabase.from("audit_logs").insert({
        action: "delete_invoice",
        table_name: "invoices",
        record_id: invoice.id,
        user_id: user?.id || null,
        old_data: invoice,
      });
      const { error } = await supabase.from("invoices").delete().eq("id", invoice.id);
      if (error) throw error;
      toast({ title: "Invoice deleted", description: `${invoice.invoice_number} and associated records removed.` });
      fetchInvoices();
      fetchPayments();
      if (stmtStudent) selectStmtStudent(stmtStudent);
    } catch (err: any) {
      toast({ title: "Error deleting invoice", description: err.message, variant: "destructive" });
    }
  }

  // ═══ COMPUTED ═══
  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceStatusFilter !== "all" && inv.status !== invoiceStatusFilter) return false;
    if (invoiceTermFilter !== "all" && inv.term !== invoiceTermFilter) return false;
    if (invoiceSearch) {
      const s = invoiceSearch.toLowerCase();
      const name = inv.students?.full_name?.toLowerCase() || "";
      const num = inv.invoice_number?.toLowerCase() || "";
      const adm = inv.students?.admission_number?.toLowerCase() || "";
      if (!name.includes(s) && !num.includes(s) && !adm.includes(s)) return false;
    }
    return true;
  });

  const totalOwedUsd = debtors.reduce((s, d) => s + (parseFloat(d.total_usd) - parseFloat(d.paid_usd)), 0);
  const totalOwedZig = debtors.reduce((s, d) => s + (parseFloat(d.total_zig) - parseFloat(d.paid_zig)), 0);
  const totalCollectedUsd = payments.reduce((s, p) => s + parseFloat(p.amount_usd || 0), 0);
  const totalCollectedZig = payments.reduce((s, p) => s + parseFloat(p.amount_zig || 0), 0);
  const totalExpensesUsd = expenses.reduce((s, e) => s + parseFloat(e.amount_usd || 0), 0);
  const totalExpensesZig = expenses.reduce((s, e) => s + parseFloat(e.amount_zig || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards (unchanged) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Collected",
            usd: totalCollectedUsd,
            zig: totalCollectedZig,
            icon: DollarSign,
            color: "text-green-600",
          },
          { label: "Outstanding", usd: totalOwedUsd, zig: totalOwedZig, icon: AlertTriangle, color: "text-red-600" },
          {
            label: "Expenses",
            usd: totalExpensesUsd,
            zig: totalExpensesZig,
            icon: TrendingUp,
            color: "text-amber-600",
          },
          {
            label: "Net Income (USD)",
            usd: totalCollectedUsd - totalExpensesUsd,
            zig: totalCollectedZig - totalExpensesZig,
            icon: BarChart3,
            color: "text-accent",
          },
        ].map((c, i) => (
          <Card key={i} className="border-none shadow-maroon">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <c.icon className={`h-5 w-5 ${c.color}`} />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{c.label}</span>
              </div>
              <p className="text-lg font-bold">USD {fmt(c.usd)}</p>
              <p className="text-sm text-muted-foreground">ZiG {fmt(c.zig)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="fee-structures" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="fee-structures">
            <DollarSign className="mr-1 h-4 w-4" /> Fee Structures
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="mr-1 h-4 w-4" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="mr-1 h-4 w-4" /> Payments
          </TabsTrigger>
          <TabsTrigger value="receipts">
            <Receipt className="mr-1 h-4 w-4" /> Receipts
          </TabsTrigger>
          <TabsTrigger value="debtors">
            <AlertTriangle className="mr-1 h-4 w-4" /> Debtors
          </TabsTrigger>
          <TabsTrigger value="petty-cash">
            <DollarSign className="mr-1 h-4 w-4" /> Petty Cash
          </TabsTrigger>
          <TabsTrigger value="supplier-payables">
            <Ban className="mr-1 h-4 w-4" /> Supplier Payables
          </TabsTrigger>
          <TabsTrigger value="statements">
            <User className="mr-1 h-4 w-4" /> Statements
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <Receipt className="mr-1 h-4 w-4" /> Expenses
          </TabsTrigger>
          <TabsTrigger value="bank-recon">
            <CheckCircle className="mr-1 h-4 w-4" /> Bank Reconciliation
          </TabsTrigger>
          <TabsTrigger value="income-expenditure">
            <TrendingDown className="mr-1 h-4 w-4" /> Income & Expenditure
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="mr-1 h-4 w-4" /> Reports
          </TabsTrigger>
        </TabsList>

        {/* Fee Structures Tab – unchanged */}
        <TabsContent value="fee-structures">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading">Fee Structures</CardTitle>
                <CardDescription>Define fees per form, term, and boarding status</CardDescription>
              </div>
              <Button onClick={openAddFee} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="mr-1 h-4 w-4" /> Add Fee
              </Button>
            </CardHeader>
            <CardContent>
              {feeStructures.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No fee structures yet. Click "Add Fee" to create one.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Form</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">USD</TableHead>
                        <TableHead className="text-right">ZiG</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeStructures.map((fee) => (
                        <TableRow key={fee.id}>
                          <TableCell>{fee.academic_year}</TableCell>
                          <TableCell>{fee.term}</TableCell>
                          <TableCell>{fee.form}</TableCell>
                          <TableCell>{fee.boarding_status === "boarding" ? "Boarding" : "Day"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{fee.description || "—"}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(fee.amount_usd)}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(fee.amount_zig)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditFee(fee)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => duplicateFee(fee)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openDeleteImpact(fee)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
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
        </TabsContent>

        {/* Invoices Tab – updated bulk generation */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="font-heading">Invoices</CardTitle>
                <CardDescription>{invoices.length} total invoices</CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSingleInvOpen(true);
                    setSingleInvSelectedStudent(null);
                    setSingleInvForm({
                      student_search: "",
                      student_id: "",
                      academic_year: "2026",
                      term: "Term 1",
                      due_date: "",
                      description: "",
                      amount_usd: "",
                      amount_zig: "",
                    });
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" /> Create Invoice
                </Button>
                <Button
                  onClick={() => setBulkInvoiceOpen(true)}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  <Plus className="mr-1 h-4 w-4" /> Bulk Generate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters – unchanged */}
              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, admission # or invoice #"
                    className="pl-9"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                  />
                </div>
                <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={invoiceTermFilter} onValueChange={setInvoiceTermFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Terms</SelectItem>
                    {termOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredInvoices.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No invoices found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Form</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Total USD</TableHead>
                        <TableHead className="text-right">Total ZiG</TableHead>
                        <TableHead className="text-right">Paid USD</TableHead>
                        <TableHead className="text-right">Paid ZiG</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                        {isFinanceOrAdmin && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                          <TableCell>{inv.students?.full_name || "—"}</TableCell>
                          <TableCell>{inv.students?.form || "—"}</TableCell>
                          <TableCell>{inv.term}</TableCell>
                          <TableCell className="text-xs">
                            {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "Not set"}
                          </TableCell>
                          <TableCell className="text-right font-mono">{fmt(inv.total_usd)}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(inv.total_zig)}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(inv.paid_usd)}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(inv.paid_zig)}</TableCell>
                          <TableCell>{statusBadge(inv.status)}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(inv.total_usd - inv.paid_usd)}</TableCell>
                          {isFinanceOrAdmin && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openViewInvoice(inv)}
                                  title="View Invoice"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => downloadInvoicePdf(inv)}
                                  title="Download PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => printInvoice(inv)}
                                  title="Print Invoice"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteInvoice(inv)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ PAYMENTS TAB – FULLY RESTORED ═══════ */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading">Payments</CardTitle>
                <CardDescription>{payments.length} payments recorded</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Plus className="mr-1 h-4 w-4" /> Record Payment <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setPayDialogOpen(true);
                      setSelectedStudent(null);
                      setStudentInvoices([]);
                      setPayForm({
                        student_search: "",
                        invoice_id: "",
                        amount_usd: "",
                        amount_zig: "",
                        payment_method: "Cash",
                        reference_number: "",
                        payment_date: new Date().toISOString().split("T")[0],
                        notes: "",
                      });
                    }}
                  >
                    <User className="mr-2 h-4 w-4" /> Student Fee Payment
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSpInvoice(null);
                      setSpDialogOpen(true);
                      setSpForm({
                        payment_date: new Date().toISOString().split("T")[0],
                        amount_usd: "",
                        amount_zig: "",
                        payment_method: "Cash",
                        reference_number: "",
                        notes: "",
                      });
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" /> Supplier Invoice Payment
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setCodDialogOpen(true);
                      setCodForm({
                        supplier_name: "",
                        supplier_contact: "",
                        description: "",
                        amount_usd: "",
                        amount_zig: "",
                        payment_method: "Cash",
                        payment_date: new Date().toISOString().split("T")[0],
                        reference_number: "",
                        notes: "",
                      });
                    }}
                  >
                    <Truck className="mr-2 h-4 w-4" /> Cash on Delivery (COD)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead className="text-right">USD</TableHead>
                        <TableHead className="text-right">ZiG</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Ref</TableHead>
                        {isFinanceOrAdmin && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((pay) => (
                        <TableRow key={pay.id}>
                          <TableCell className="font-mono text-xs">{pay.receipt_number}</TableCell>
                          <TableCell>{pay.payment_date}</TableCell>
                          <TableCell>{pay.students?.full_name || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{pay.invoices?.invoice_number || "—"}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(pay.amount_usd)}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(pay.amount_zig)}</TableCell>
                          <TableCell>{pay.payment_method}</TableCell>
                          <TableCell className="text-xs">{pay.reference_number || "—"}</TableCell>
                          {isFinanceOrAdmin && (
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => deletePayment(pay)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs (Receipts, Debtors, Petty Cash, Supplier Payables, Statements, Expenses, etc.) remain unchanged – omitted for brevity. They are the same as the original file. */}
      </Tabs>

      {/* Dialogs – updated single invoice dialog */}
      {/* Bulk Invoice Dialog unchanged */}
      <Dialog open={bulkInvoiceOpen} onOpenChange={setBulkInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Generate Invoices</DialogTitle>
            <DialogDescription>Generate invoices for all active students based on fee structures.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input value={bulkYear} onChange={(e) => setBulkYear(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={bulkTerm} onValueChange={setBulkTerm}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {termOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={bulkDueDate} onChange={(e) => setBulkDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={generateBulkInvoices}
              disabled={bulkLoading}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {bulkLoading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Generate Invoices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Invoice Dialog – UPDATED */}
      <Dialog open={singleInvOpen} onOpenChange={setSingleInvOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Invoice for Student</DialogTitle>
            <DialogDescription>Generate an invoice for a specific student</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Search Student *</Label>
              <Input
                placeholder="Type student name or admission #..."
                value={singleInvForm.student_search}
                onChange={(e) => {
                  setSingleInvForm((f) => ({ ...f, student_search: e.target.value }));
                  searchSingleInvStudents(e.target.value);
                }}
              />
              {singleInvStudentResults.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  {singleInvStudentResults.map((s) => (
                    <div
                      key={s.id}
                      className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                      onClick={() => selectSingleInvStudent(s)}
                    >
                      {s.full_name} — {s.admission_number} ({s.form})
                    </div>
                  ))}
                </div>
              )}
              {singleInvSelectedStudent && (
                <Badge variant="outline" className="mt-1">
                  {singleInvSelectedStudent.full_name} — {singleInvSelectedStudent.admission_number}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Academic Year</Label>
                <Select
                  value={singleInvForm.academic_year}
                  onValueChange={(v) => {
                    setSingleInvForm((f) => ({ ...f, academic_year: v }));
                    if (singleInvSelectedStudent) fetchFeeStructuresForStudent(singleInvSelectedStudent);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["2024", "2025", "2026", "2027"].map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Term</Label>
                <Select
                  value={singleInvForm.term}
                  onValueChange={(v) => {
                    setSingleInvForm((f) => ({ ...f, term: v }));
                    if (singleInvSelectedStudent) fetchFeeStructuresForStudent(singleInvSelectedStudent);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {termOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fee Structure Selection */}
            <div className="space-y-1">
              <Label>Fee Structure</Label>
              <Select
                value={selectedFeeStructure?.id || ""}
                onValueChange={(id) => {
                  const fs = availableFeeStructures.find((f) => f.id === id);
                  setSelectedFeeStructure(fs);
                  if (fs) {
                    setSingleInvForm((f) => ({
                      ...f,
                      amount_usd: String(fs.amount_usd),
                      amount_zig: String(fs.amount_zig),
                      description: fs.description || "",
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a fee structure" />
                </SelectTrigger>
                <SelectContent>
                  {availableFeeStructures.map((fs) => (
                    <SelectItem key={fs.id} value={fs.id}>
                      {fs.description || `${fs.form} - ${fs.boarding_status === "boarding" ? "Boarding" : "Day"} Fees`}{" "}
                      – USD {fs.amount_usd} / ZiG {fs.amount_zig}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={singleInvForm.due_date}
                onChange={(e) => setSingleInvForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSingleInvOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={createSingleInvoice}
              disabled={
                singleInvLoading ||
                !singleInvSelectedStudent ||
                (!singleInvForm.amount_usd && !singleInvForm.amount_zig)
              }
            >
              {singleInvLoading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Other dialogs (Payment, Expense, etc.) remain unchanged – omitted for brevity */}
    </div>
  );
}
