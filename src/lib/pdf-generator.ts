import jsPDF from "jspdf";

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
