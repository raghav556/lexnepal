"use client";

import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

export interface PortalLocalizedTextProps {
  /** i18n key — Nepali copy used when language is `ne`. */
  i18nKey: string;
  /** English fallback when key is missing. */
  fallback?: string;
  as?: "span" | "p" | "h1" | "h2";
  className?: string;
  nepaliClassName?: string;
}

/** Renders translated portal copy with Devanagari-friendly styling in Nepali mode. */
export function PortalLocalizedText({
  i18nKey,
  fallback,
  as: Tag = "span",
  className,
  nepaliClassName,
}: PortalLocalizedTextProps) {
  const { language, t } = useI18n();
  const translated = t(i18nKey);
  const text = translated !== i18nKey ? translated : (fallback ?? i18nKey);

  return (
    <Tag
      className={cn(className, language === "ne" && "font-nepali leading-relaxed", nepaliClassName)}
      lang={language === "ne" ? "ne" : "en"}
    >
      {text}
    </Tag>
  );
}
