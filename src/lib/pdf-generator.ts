import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatNPR } from "./lex-constants.ts";

export function generateInvoicePDF(
  invoice: any,
  client: any,
  caseData: any,
  lineItems: any[] = [],
) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138); // Blue 900
  doc.text("Srimar Law", 14, 22);

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
  doc.text(
    caseData?.title?.slice(0, 30) + (caseData?.title?.length > 30 ? "..." : "") || "",
    140,
    65,
  );

  // Line Items Table — prefer invoice line items; fall back to legacy time-entry shape
  const tableData =
    lineItems.length > 0
      ? lineItems.map((line) => [
          line.type || "Item",
          line.description,
          String(line.quantity ?? ""),
          formatNPR(line.unitPrice ?? 0),
          formatNPR(line.amount ?? 0),
        ])
      : [
          [
            "Summary",
            "Legal services (see firm for itemized breakdown)",
            "1",
            formatNPR(invoice.subtotal ?? invoice.total ?? 0),
            formatNPR(invoice.subtotal ?? invoice.total ?? 0),
          ],
        ];

  (doc as any).autoTable({
    startY: 85,
    head: [["Type", "Description", "Qty", "Unit", "Amount"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [30, 58, 138] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 20, halign: "right" },
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

/** Certificate of completion for an e-signed document (client-downloadable evidence pack). */
export function generateSignatureCertificatePDF(input: {
  title: string;
  documentId: string;
  signedAt?: string | null;
  signatureMethod?: string | null;
  documentSha256?: string | null;
  typedSignatureText?: string | null;
  signerName?: string | null;
  consentVersion?: string;
}) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("Certificate of Completion", 14, 24);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Srimar Law — Electronic Signature Evidence", 14, 32);

  doc.setTextColor(0, 0, 0);
  const rows: [string, string][] = [
    ["Document", input.title],
    ["Document ID", input.documentId],
    ["Signed at", input.signedAt ? new Date(input.signedAt).toLocaleString() : "—"],
    ["Signer", input.signerName || "Portal client"],
    ["Method", input.signatureMethod || "—"],
    ["Consent version", input.consentVersion || "esign-consent-v1"],
    ["Document SHA-256", input.documentSha256 || "Recorded at signature time"],
  ];
  if (input.typedSignatureText) {
    rows.push(["Typed signature", input.typedSignatureText]);
  }

  let y = 48;
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 14, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(value), 120);
    doc.text(lines, 55, y);
    y += Math.max(8, lines.length * 5 + 3);
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "This certificate summarizes the signature event recorded by the Srimar Law client portal.",
    14,
    Math.min(y + 12, 280),
  );
  doc.save(`certificate-${input.documentId.slice(0, 8)}.pdf`);
}
