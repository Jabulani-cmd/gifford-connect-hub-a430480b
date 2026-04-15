import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getLogoDataUrl, SCHOOL_NAME, SCHOOL_MOTTO, SCHOOL_ADDRESS, SCHOOL_LOGO_URL } from "@/lib/finance/pdf";

/**
 * Reusable branded HTML shell for print views.
 */
export function brandedPrintHtml(
  title: string,
  bodyContent: string,
  extra?: { subtitle?: string; landscape?: boolean }
) {
  const date = new Date().toLocaleDateString("en-GB");
  return `<!DOCTYPE html><html><head><title>${title}</title>
  <style>
    @page { size: ${extra?.landscape ? "landscape" : "portrait"}; margin: 15mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; margin: 0; color: #1a1a1a; font-size: 12px; line-height: 1.4; }
    .school-header { display: flex; align-items: center; gap: 18px; border-bottom: 3px solid #800000; padding-bottom: 14px; margin-bottom: 20px; }
    .school-header img { width: 80px; height: 80px; object-fit: contain; }
    .school-header .info h1 { font-size: 22px; margin: 0; color: #800000; font-weight: 700; letter-spacing: 0.5px; }
    .school-header .info p { font-size: 11px; color: #555; margin: 3px 0 0; }
    .school-header .info .motto { font-style: italic; color: #800000; font-size: 12px; margin-top: 2px; }
    .report-title { font-size: 16px; font-weight: 700; color: #1a1a1a; margin: 0 0 4px; }
    .report-subtitle { font-size: 11px; color: #666; margin: 0 0 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #800000; color: #fff; font-weight: 600; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
    td { border: 1px solid #ddd; padding: 6px 10px; font-size: 11px; }
    tr:nth-child(even) { background: #fdf5f5; }
    tr:hover { background: #f5e8e8; }
    .right { text-align: right; }
    .mono { font-family: 'Consolas', 'Courier New', monospace; }
    .red { color: #c00; }
    .green { color: #060; }
    .total-row { font-weight: 700; background: #fef2f2 !important; border-top: 2px solid #800000; }
    .summary-box { margin-top: 20px; padding: 14px 18px; border: 2px solid #800000; border-radius: 6px; display: inline-block; background: #fdf5f5; }
    .summary-box p { margin: 4px 0; }
    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9px; color: #999; text-align: center; }
    h2, h3 { color: #800000; }
    .no-print { }
    @media print { 
      body { padding: 10px; } 
      .no-print { display: none !important; } 
      tr:hover { background: inherit; }
    }
  </style></head><body>
  <div class="school-header">
    <img src="${SCHOOL_LOGO_URL}" alt="School Logo" />
    <div class="info">
      <h1>${SCHOOL_NAME}</h1>
      <p class="motto">${SCHOOL_MOTTO}</p>
      <p>${SCHOOL_ADDRESS}</p>
    </div>
  </div>
  <p class="report-title">${title}</p>
  <p class="report-subtitle">${extra?.subtitle || `Generated: ${date}`}</p>
  ${bodyContent}
  <div class="footer">${SCHOOL_NAME} &mdash; Confidential Document &mdash; Generated ${date}</div>
  <div class="no-print" style="margin-top:20px;text-align:center">
    <button onclick="window.print()" style="padding:10px 28px;background:#800000;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-weight:600">🖨 Print Document</button>
  </div>
  </body></html>`;
}

/**
 * Open a branded print view in a new window.
 */
export function printBrandedTable(
  title: string,
  headers: string[],
  rows: string[][],
  _logoUrl?: string
) {
  const headCells = headers.map((h) => `<th>${h}</th>`).join("");
  const bodyRows = rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("");
  const tableHtml = `<table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table>
    <p style="font-size:11px;color:#666;margin-top:8px">Total records: ${rows.length}</p>`;
  const html = brandedPrintHtml(title, tableHtml, { landscape: headers.length > 6 });
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

/**
 * Open a branded print view with custom HTML body content.
 */
export function printBrandedHtml(
  title: string,
  bodyContent: string,
  options?: { subtitle?: string; landscape?: boolean }
) {
  const html = brandedPrintHtml(title, bodyContent, options);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

/**
 * Generate a branded PDF with school logo and download it.
 */
export async function downloadBrandedPdf(
  title: string,
  headers: string[],
  rows: string[][],
  filename?: string
) {
  const logoDataUrl = await getLogoDataUrl();
  const orientation = headers.length > 6 ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation } as any);
  const pageWidth = doc.internal.pageSize.getWidth();
  const date = new Date().toLocaleDateString("en-GB");

  // Logo — larger for professional look
  try {
    doc.addImage(logoDataUrl, "PNG", 14, 8, 28, 28);
  } catch {}

  // School header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(128, 0, 0);
  doc.text(SCHOOL_NAME, 46, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(128, 0, 0);
  doc.text(SCHOOL_MOTTO, 46, 25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(SCHOOL_ADDRESS, 46, 31);

  // Maroon line
  doc.setDrawColor(128, 0, 0);
  doc.setLineWidth(1);
  doc.line(14, 38, pageWidth - 14, 38);

  // Report title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(title, 14, 47);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${date}  |  Records: ${rows.length}`, 14, 53);

  // Table
  autoTable(doc, {
    startY: 58,
    head: [headers],
    body: rows,
    theme: "grid",
    headStyles: {
      fillColor: [128, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [253, 245, 245] },
    margin: { left: 14, right: 14 },
    didDrawPage: (data: any) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `${SCHOOL_NAME}  —  Page ${data.pageNumber} of ${pageCount}  —  Confidential`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" }
      );
    },
  });

  const safeName = filename || `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(safeName);
}
