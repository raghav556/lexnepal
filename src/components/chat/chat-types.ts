export type ChatRole =
  | "admin"
  | "partner"
  | "senior_associate"
  | "associate"
  | "paralegal"
  | "intern"
  | "client"
  | "system";

export interface ChatUser {
  id: string;
  name: string;
  email?: string | null;
  role?: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
}

export interface ChatAttachment {
  id: string;
  name: string;
  sizeBytes?: number;
  mimeType?: string;
  url?: string;
  storageId?: string;
}

export interface UnifiedChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderAvatar?: string | null;
  content: string;
  createdAt: string | Date;
  isInternal?: boolean; // For case team discussions
  isMe: boolean;
  attachments?: ChatAttachment[];
  status?: "sending" | "sent" | "delivered" | "read";
}

export interface CannedLegalTemplate {
  id: string;
  title: string;
  text: string;
  category: "updates" | "requests" | "court" | "general";
}

export const CANNED_LEGAL_TEMPLATES: CannedLegalTemplate[] = [
  {
    id: "docs-received",
    title: "Documents Received & Verified",
    text: "Thank you. We have received your documents and our legal team is currently reviewing them.",
    category: "updates",
  },
  {
    id: "drafting-progress",
    title: "Drafting In Progress",
    text: "Our team has commenced drafting the petition / legal document. We will share the initial draft for your review shortly.",
    category: "updates",
  },
  {
    id: "hearing-scheduled",
    title: "Hearing Date Notification",
    text: "The court has scheduled the next hearing for this matter. We are preparing the required submissions and will brief you prior to the date.",
    category: "court",
  },
  {
    id: "kyc-request",
    title: "Request for KYC / Verification",
    text: "Please provide the requested identification and address verification documents to complete the regulatory onboarding requirement.",
    category: "requests",
  },
  {
    id: "internal-strategy",
    title: "🔒 Internal Strategy Alignment",
    text: "Case team: Please review the latest counterparty response and prepare arguments on jurisdictional grounds before tomorrow's conference.",
    category: "general",
  },
];
