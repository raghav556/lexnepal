import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatNPR } from "./lex-constants.ts";

export function generateInvoicePDF(
  invoice: any,
  client: any,
  caseData: any,
  timeEntries: any[]
) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138); // Blue 900
  doc.text("LexNepal", 14, 22);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Nepal's Premier Legal Practice", 14, 28);
  doc.text("Thapathali, Kathmandu, Nepal", 14, 33);
  doc.text("PAN/VAT No: 301234567", 14, 38);
  
  // TAX INVOICE title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("TAX INVOICE", 150, 22);
  
  // Invoice Info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 140, 30);
  doc.text(`Date Issued: ${invoice.issuedDate}`, 140, 35);
  doc.text(`Due Date: ${invoice.dueDate}`, 140, 40);
  
  // Bill To
  doc.setFont("helvetica", "bold");
  doc.text("Billed To:", 14, 55);
  doc.setFont("helvetica", "normal");
  doc.text(client.fullName, 14, 60);
  if (client.companyName) doc.text(client.companyName, 14, 65);
  if (client.address) doc.text(client.address, 14, 70);
  
  // Matter Details
  doc.setFont("helvetica", "bold");
  doc.text("Matter Details:", 140, 55);
  doc.setFont("helvetica", "normal");
  doc.text(caseData?.caseNumber || "General Matter", 140, 60);
  doc.text(caseData?.title?.slice(0, 30) + (caseData?.title?.length > 30 ? "..." : "") || "", 140, 65);
  
  // Line Items Table
  const tableData = timeEntries.map((entry) => [
    entry.date,
    entry.description,
    `${entry.minutes} mins`,
    formatNPR(entry.ratePerHour) + "/hr",
    formatNPR((entry.minutes / 60) * entry.ratePerHour),
  ]);
  
  (doc as any).autoTable({
    startY: 85,
    head: [["Date", "Description", "Duration", "Rate", "Amount"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [30, 58, 138] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
  });
  
  // Summary
  const finalY = (doc as any).lastAutoTable.finalY || 85;
  
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", 140, finalY + 10);
  doc.text(formatNPR(invoice.subtotal), 180, finalY + 10, { align: "right" });
  
  doc.text("VAT (13%):", 140, finalY + 16);
  doc.text(formatNPR(invoice.vatAmount), 180, finalY + 16, { align: "right" });
  
  doc.setFont("helvetica", "bold");
  doc.text("Total Amount:", 140, finalY + 24);
  doc.text(formatNPR(invoice.total), 180, finalY + 24, { align: "right" });
  
  // Footer / Payment Terms
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("Payment is due within the stipulated due date.", 14, finalY + 40);
  doc.text("Bank Transfer: Nepal Bank Ltd. A/C 0123456789012345", 14, finalY + 45);
  
  // Save PDF
  doc.save(`${invoice.invoiceNumber}.pdf`);
}
