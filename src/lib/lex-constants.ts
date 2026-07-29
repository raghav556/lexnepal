export const ROLE_LABELS: Record<string, string> = {
  partner: "Partner",
  senior_associate: "Senior Associate",
  associate: "Associate",
  paralegal: "Paralegal",
  intern: "Intern",
  admin: "Admin",
  client: "Client",
};

export const PRACTICE_AREAS = [
  "Corporate Law", "Family Law", "Criminal Law", "Property & Real Estate",
  "Immigration", "Intellectual Property", "Labor & Employment", "Tax Law",
  "Civil Litigation", "Constitutional Law", "Banking & Finance", "Arbitration & ADR",
];

export const COURTS = [
  "Supreme Court of Nepal", "High Court — Patan", "High Court — Butwal",
  "High Court — Biratnagar", "High Court — Pokhara", "High Court — Hetauda",
  "District Court — Kathmandu", "District Court — Lalitpur", "Labour Court",
  "Revenue Tribunal", "Administrative Court", "Other",
];

export const VAT_RATE = 0.13;

export function formatNPR(amount: number): string {
  return new Intl.NumberFormat("ne-NP", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(amount);
}

export function calculateVat(subtotal: number): number {
  return Math.round(subtotal * VAT_RATE);
}
