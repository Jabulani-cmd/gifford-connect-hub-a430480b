import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getLogoDataUrl, SCHOOL_NAME, SCHOOL_MOTTO, SCHOOL_ADDRESS } from "@/lib/finance/pdf";

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

  // Logo
  try {
    doc.addImage(logoDataUrl, "PNG", 14, 10, 22, 22);
  } catch {}

  // School header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(128, 0, 0);
  doc.text(SCHOOL_NAME, 40, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100);
  doc.text(SCHOOL_MOTTO, 40, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(SCHOOL_ADDRESS, 40, 29);

  // Maroon line
  doc.setDrawColor(128, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(14, 35, pageWidth - 14, 35);

  // Report title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text(title, 14, 43);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Generated: ${date}`, 14, 48);

  // Table
  autoTable(doc, {
    startY: 52,
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
    alternateRowStyles: { fillColor: [249, 245, 245] },
    margin: { left: 14, right: 14 },
    didDrawPage: (data: any) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `${SCHOOL_NAME} — Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" }
      );
    },
  });

  const safeName = filename || `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(safeName);
}

/**
 * Open a branded print view in a new window.
 */
export function printBrandedTable(
  title: string,
  headers: string[],
  rows: string[][],
  logoUrl?: string
) {
  const win = window.open("", "_blank");
  if (!win) return;
  const date = new Date().toLocaleDateString("en-GB");
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="width:60px;height:60px;object-fit:contain" />`
    : "";
  const headCells = headers.map((h) => `<th>${h}</th>`).join("");
  const bodyRows = rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("");

  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
    .header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #800000; padding-bottom: 10px; margin-bottom: 14px; }
    .header-text h1 { font-size: 18px; margin: 0; color: #000; }
    .header-text p { font-size: 10px; color: #555; margin: 2px 0; }
    .header-text .motto { font-style: italic; color: #800000; }
    h2 { font-size: 14px; color: #333; margin: 0 0 4px; }
    .meta { font-size: 10px; color: #888; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #800000; color: #fff; padding: 6px 8px; text-align: left; }
    td { border: 1px solid #ddd; padding: 5px 8px; }
    tr:nth-child(even) { background: #fdf5f5; }
    @media print { body { padding: 10px; } .no-print { display: none; } }
  </style></head><body>
  <div class="header">${logoHtml}<div class="header-text">
    <h1>${SCHOOL_NAME}</h1>
    <p class="motto">${SCHOOL_MOTTO}</p>
    <p>${SCHOOL_ADDRESS}</p>
  </div></div>
  <h2>${title}</h2>
  <p class="meta">Generated: ${date} &bull; Records: ${rows.length}</p>
  <table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table>
  <br/><button class="no-print" onclick="window.print()">Print</button>
  </body></html>`);
  win.document.close();
}
