import { Megaphone, Newspaper, Trophy, type LucideIcon } from "lucide-react";

export type NewsType = "award" | "press_release" | "firm_news";

export const NEWS_TYPE_FILTERS = [
  { value: "all", label: "All Updates", short: "All" },
  { value: "award", label: "Awards", short: "Awards" },
  { value: "press_release", label: "Press Releases", short: "Press" },
  { value: "firm_news", label: "Firm News", short: "Firm" },
] as const;

export function newsTypeIcon(type: string): LucideIcon {
  switch (type) {
    case "award":
      return Trophy;
    case "press_release":
      return Megaphone;
    default:
      return Newspaper;
  }
}

export function newsTypeLabel(type: string): string {
  switch (type) {
    case "award":
      return "Award & Recognition";
    case "press_release":
      return "Press Release";
    default:
      return "Firm News";
  }
}

export function newsTypeBadgeClass(type: string): string {
  switch (type) {
    case "award":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    case "press_release":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    default:
      return "bg-accent/10 text-accent border-accent/20";
  }
}

export function formatNewsDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export const NEWS_PAD = "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 min-w-0";

export const DEFAULT_NEWS_IMAGE =
  "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80";
