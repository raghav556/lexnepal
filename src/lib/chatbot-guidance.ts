import { resolvePublicContact } from "@/lib/business-settings";

export type GuidedIntent =
  | "greeting"
  | "location"
  | "hours"
  | "contact"
  | "practice_areas"
  | "team"
  | "consultation"
  | "complex_case"
  | "unknown";

export type GuidedResponse = {
  content: string;
  isForm?: boolean;
  linkText?: string;
  linkHref?: string;
};

export function evaluateGuidedIntent(text: string): GuidedIntent {
  const lower = text.toLowerCase();
  if (
    /(divorce|sue|arrest|police|jail|stole|fraud|cheat|murder|rape|crime|court|judge)/.test(lower)
  )
    return "complex_case";
  const scores: Record<Exclude<GuidedIntent, "complex_case" | "unknown">, number> = {
    greeting: (lower.match(/(hi|hello|hey|morning|afternoon)/g) || []).length * 2,
    location: (lower.match(/(where|location|address|visit|office)/g) || []).length * 2,
    hours: (lower.match(/(time|hours|open|close|saturday|sunday)/g) || []).length * 2,
    contact: (lower.match(/(contact|phone|email|call|number)/g) || []).length * 2,
    practice_areas:
      (
        lower.match(
          /(practice|areas|services|do you handle|corporate|civil|criminal|property|ip|labor)/g,
        ) || []
      ).length * 2,
    team: (lower.match(/(lawyer|attorney|advocate|team|who|partner|associate)/g) || []).length * 2,
    consultation: (lower.match(/(book|appointment|consultation|meet|fee|cost)/g) || []).length * 2,
  };
  const match = Object.entries(scores).sort((left, right) => right[1] - left[1])[0];
  return match && match[1] > 0 ? (match[0] as GuidedIntent) : "unknown";
}

export function buildGuidedResponse(input: {
  intent: GuidedIntent;
  settings?: Record<string, unknown>;
  practiceAreas?: Array<{ title?: string; description?: string }>;
}): GuidedResponse {
  const firmName = clean(input.settings?.firmName) || "the firm";
  const address = clean(input.settings?.address);
  const hours = clean(input.settings?.businessHoursText);
  switch (input.intent) {
    case "greeting":
      return {
        content: `Hello. I’m ${firmName}’s automated website guide. I can point you to published information or help you submit a callback request, but I cannot provide legal advice.`,
      };
    case "location":
      return address
        ? {
            content: `The published office address is: ${address}.`,
            linkText: "Contact Details",
            linkHref: "/contact",
          }
        : {
            content:
              "An office address has not been published in the website settings. Please use the Contact page for verified details.",
            linkText: "Open Contact Page",
            linkHref: "/contact",
          };
    case "hours":
      return hours
        ? { content: `The published office hours are: ${hours}.` }
        : {
            content:
              "Office hours have not been published. Please confirm availability through the Contact page before visiting.",
            linkText: "Open Contact Page",
            linkHref: "/contact",
          };
    case "contact":
      return {
        content: `Published contact details:\n${resolvePublicContact(input.settings)}\n\nYou may also submit your details for the firm to review. A response time is not guaranteed.`,
        isForm: true,
      };
    case "practice_areas": {
      const titles = (input.practiceAreas || []).map((area) => clean(area.title)).filter(Boolean);
      return {
        content:
          titles.length > 0
            ? `Published practice areas include:\n• ${titles.join("\n• ")}`
            : "No practice-area summary is currently published in this guide. The Practice Areas page contains the available website information.",
        linkText: "View Practice Areas",
        linkHref: "/practice-areas",
      };
    }
    case "team":
      return {
        content:
          "The Lawyers page contains the profiles the firm has chosen to publish. This guide does not invent staff names, roles or availability.",
        linkText: "View Published Lawyers",
        linkHref: "/lawyers",
      };
    case "consultation":
      return {
        content:
          "You can submit a consultation request through the booking page. Submission does not confirm availability, fees or an attorney-client relationship; the firm must review it.",
        linkText: "Request Consultation",
        linkHref: "/consultation",
      };
    case "complex_case":
      return {
        content:
          "This automated guide cannot assess your situation or provide legal advice. Do not include confidential or urgent details here. You may submit basic contact details for the firm to review, or contact emergency services when immediate safety is at risk.",
        isForm: true,
      };
    default:
      return {
        content:
          "I could not match that question to published website information. I can guide you to Practice Areas, Lawyers, Contact or Consultation, or collect basic callback details. I cannot provide legal advice.",
        isForm: true,
      };
  }
}

export function validateCallbackContact(value: string) {
  const contact = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return true;
  const digits = contact.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
