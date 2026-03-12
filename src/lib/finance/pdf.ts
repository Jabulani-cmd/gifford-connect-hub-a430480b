import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type Money = { usd: number; zig: number };

export type InvoicePdfInput = {
  schoolName: string;
  motto?: string;
  logoDataUrl?: string;
  invoiceNumber: string;
  academicYear: string;
  term: string;
  dueDate?: string | null;
  student: { fullName: string; admissionNumber: string; form?: string | null };
  items: { description: string; amount_usd: number; amount_zig: number }[];
  totals: { total_usd: number; total_zig: number; paid_usd: number; paid_zig: number };
};

export async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load image: ${res.status}`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

export function buildInvoicePdf(input: InvoicePdfInput): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  const topY = 14;
  if (input.logoDataUrl) {
    try {
      doc.addImage(input.logoDataUrl, "PNG", 14, 10, 18, 18);
    } catch {
      // Ignore logo rendering errors
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(input.schoolName, pageWidth / 2, topY, { align: "center" });

  if (input.motto) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(input.motto, pageWidth / 2, topY + 5, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("INVOICE", pageWidth / 2, topY + 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Invoice #: ${input.invoiceNumber}`, 14, topY + 22);
  doc.text(`Term: ${input.term}  Year: ${input.academicYear}`, 14, topY + 27);
  doc.text(`Due Date: ${input.dueDate ? new Date(input.dueDate).toLocaleDateString() : "—"}`, 14, topY + 32);

  doc.text(`Student: ${input.student.fullName}`, 14, topY + 40);
  doc.text(`Admission #: ${input.student.admissionNumber}`, 14, topY + 45);
  if (input.student.form) {
    doc.text(`Form: ${input.student.form}`, 14, topY + 50);
  }

  doc.line(14, topY + 54, pageWidth - 14, topY + 54);

  autoTable(doc, {
    startY: topY + 58,
    head: [["Description", "USD", "ZiG"]],
    body: input.items.map((it) => [
      it.description,
      Number(it.amount_usd || 0).toFixed(2),
      Number(it.amount_zig || 0).toFixed(2),
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [128, 0, 0] },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: "right", cellWidth: 25 },
      2: { halign: "right", cellWidth: 25 },
    },
  });

  const endY = (doc as any).lastAutoTable?.finalY || topY + 110;

  const totalUsd = Number(input.totals.total_usd || 0);
  const totalZig = Number(input.totals.total_zig || 0);
  const paidUsd = Number(input.totals.paid_usd || 0);
  const paidZig = Number(input.totals.paid_zig || 0);

  const balUsd = Math.max(0, totalUsd - paidUsd);
  const balZig = Math.max(0, totalZig - paidZig);

  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL: USD ${totalUsd.toFixed(2)}   ZiG ${totalZig.toFixed(2)}`, 14, endY + 10);
  doc.text(`PAID:  USD ${paidUsd.toFixed(2)}   ZiG ${paidZig.toFixed(2)}`, 14, endY + 16);
  doc.text(`BALANCE: USD ${balUsd.toFixed(2)}   ZiG ${balZig.toFixed(2)}`, 14, endY + 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, endY + 30);

  return doc;
}

export type ReceiptPrintInput = {
  schoolName: string;
  motto?: string;
  logoUrl?: string;
  receiptNumber: string;
  paymentDate: string;
  student: { fullName: string; admissionNumber: string; form?: string | null };
  invoiceNumber?: string | null;
  amounts: { usd: number; zig: number };
  paymentMethod: string;
  referenceNumber?: string | null;
};

export function buildReceiptHtml(input: ReceiptPrintInput) {
  const safe = (s: any) => String(s ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${safe(input.receiptNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; font-size: 12px; }
    .row { display:flex; justify-content:space-between; gap: 12px; }
    h1 { font-size: 18px; margin: 0; }
    .muted { color: #444; }
    .box { border: 2px solid #111; padding: 12px; margin-top: 14px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .right { text-align: right; }
    hr { border: 0; border-top: 1px solid #ccc; margin: 12px 0; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="row" style="align-items:center">
    <div style="display:flex; gap:12px; align-items:center;">
      ${input.logoUrl ? `<img src="${safe(input.logoUrl)}" alt="Logo" style="width:48px;height:48px;object-fit:contain" />` : ""}
      <div>
        <h1>${safe(input.schoolName)}</h1>
        ${input.motto ? `<div class="muted" style="font-style:italic; font-size:11px;">${safe(input.motto)}</div>` : ""}
      </div>
    </div>
    <div class="right">
      <div><strong>OFFICIAL RECEIPT</strong></div>
      <div class="mono">${safe(input.receiptNumber)}</div>
    </div>
  </div>

  <hr />

  <div class="row">
    <div>
      <div><strong>Student:</strong> ${safe(input.student.fullName)}</div>
      <div><strong>Admission #:</strong> <span class="mono">${safe(input.student.admissionNumber)}</span></div>
      ${input.student.form ? `<div><strong>Form:</strong> ${safe(input.student.form)}</div>` : ""}
    </div>
    <div class="right">
      <div><strong>Date:</strong> ${safe(input.paymentDate)}</div>
      ${input.invoiceNumber ? `<div><strong>Invoice:</strong> <span class="mono">${safe(input.invoiceNumber)}</span></div>` : ""}
    </div>
  </div>

  <div class="box">
    <div class="row">
      <div><strong>Payment Method:</strong> ${safe(input.paymentMethod)}</div>
      <div><strong>Reference:</strong> <span class="mono">${safe(input.referenceNumber || "—")}</span></div>
    </div>
    <hr />
    <div class="row">
      <div><strong>Amount Paid (USD):</strong></div>
      <div class="mono"><strong>${Number(input.amounts.usd || 0).toFixed(2)}</strong></div>
    </div>
    <div class="row">
      <div><strong>Amount Paid (ZiG):</strong></div>
      <div class="mono"><strong>${Number(input.amounts.zig || 0).toFixed(2)}</strong></div>
    </div>
  </div>

  <p class="muted" style="margin-top: 16px;">Thank you. Please keep this receipt for your records.</p>
</body>
</html>`;
}
