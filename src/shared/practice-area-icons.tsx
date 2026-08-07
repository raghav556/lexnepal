import {
  Briefcase,
  Building2,
  FileText,
  Gavel,
  Landmark,
  Scale,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

export const PRACTICE_AREA_ICON_OPTIONS = [
  { value: "Scale", label: "Scale (Justice)" },
  { value: "Shield", label: "Shield (Defense)" },
  { value: "Briefcase", label: "Briefcase (Business)" },
  { value: "Building2", label: "Building (Corporate)" },
  { value: "Gavel", label: "Gavel (Litigation)" },
  { value: "FileText", label: "File (Contracts)" },
  { value: "Users", label: "Users (Family/Labor)" },
  { value: "Landmark", label: "Landmark (Government)" },
] as const;

export type PracticeAreaIconName = (typeof PRACTICE_AREA_ICON_OPTIONS)[number]["value"];

const ICON_COMPONENTS: Record<string, LucideIcon> = {
  Scale,
  Shield,
  Briefcase,
  Building2,
  Gavel,
  FileText,
  Users,
  Landmark,
};

export function resolvePracticeAreaIconName(
  area: { icon?: string | null; iconName?: string | null } | string | null | undefined,
): string {
  if (typeof area === "string") return area || "Briefcase";
  return area?.icon || area?.iconName || "Briefcase";
}

export function PracticeAreaIcon({
  name,
  className = "w-5 h-5",
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = ICON_COMPONENTS[name || ""] || Briefcase;
  return <Icon className={className} />;
}
