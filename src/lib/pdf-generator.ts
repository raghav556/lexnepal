import jsPDF from "jspdf";

/** Browser-generated summary of the current signer's displayed history event. */
export function generateSignatureEventSummaryPDF(input: {
  title: string;
  signedAt?: string | null;
  signerName?: string | null;
  signatureMethod?: string | null;
  consentVersion?: string | null;
}) {
  const pdf = new jsPDF();
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(11, 40, 70);
  pdf.text("Signature Event Summary", 14, 24);

  const rows: [string, string][] = [["Document", input.title]];
  if (input.signedAt) rows.push(["Signed at", new Date(input.signedAt).toLocaleString()]);
  if (input.signerName) rows.push(["Signer", input.signerName]);
  if (input.signatureMethod) rows.push(["Method", input.signatureMethod]);
  if (input.consentVersion) rows.push(["Consent version", input.consentVersion]);

  let y = 42;
  pdf.setFontSize(10);
  pdf.setTextColor(24, 35, 48);
  for (const [label, value] of rows) {
    pdf.setFont("helvetica", "bold");
    pdf.text(`${label}:`, 14, y);
    pdf.setFont("helvetica", "normal");
    const lines = pdf.splitTextToSize(value, 125);
    pdf.text(lines, 52, y);
    y += Math.max(8, lines.length * 5 + 3);
  }

  pdf.setFontSize(8);
  pdf.setTextColor(90, 98, 108);
  pdf.text(
    "Browser-generated summary of the displayed signing event. This is not a certified document.",
    14,
    Math.min(y + 12, 280),
  );
  pdf.save("signature-event-summary.pdf");
}
